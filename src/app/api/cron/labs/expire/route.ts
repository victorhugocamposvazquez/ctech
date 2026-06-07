import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { burnFlashUsdt, clearFlashCredit } from "@/lib/evm/flash-usdt-lab";
import type { LabInjectionMode } from "@/lib/labs/types";
import { parseEvmNetwork, type EvmNetwork } from "@/lib/evm/network";
import { resolveLabContractAddress } from "@/lib/evm/contract-registry";

/**
 * GET /api/cron/labs/expire — expira inyecciones (burn modo 1, clearFlash modo 2).
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

  const { data: expired, error } = await admin
    .from("lab_injections")
    .select(
      "id, session_id, wallet_id, amount, injection_mode, lab_wallets(wallet_address), lab_sessions(network)"
    )
    .in("status", ["injected", "pending_flash"])
    .is("burned_at", null)
    .lte("expires_at", now);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];

  for (const injection of expired ?? []) {
    const walletRaw = injection.lab_wallets as
      | { wallet_address: string }
      | { wallet_address: string }[]
      | null;
    const wallet = Array.isArray(walletRaw) ? walletRaw[0] : walletRaw;
    const walletAddress = wallet?.wallet_address;

    const sessionRaw = injection.lab_sessions as
      | { network: string }
      | { network: string }[]
      | null;
    const session = Array.isArray(sessionRaw) ? sessionRaw[0] : sessionRaw;
    const network = (parseEvmNetwork(session?.network) ?? "bsc") as EvmNetwork;
    const labContractAddress = await resolveLabContractAddress(admin, network);
    const evmOptions = labContractAddress ? { labContractAddress } : undefined;
    const mode = (injection.injection_mode ?? "fake_token") as LabInjectionMode;

    if (!walletAddress) {
      results.push({ injectionId: injection.id, success: false, error: "Wallet no encontrada" });
      continue;
    }

    const burnResult =
      mode === "pending_flash"
        ? await clearFlashCredit(walletAddress, network, evmOptions)
        : await burnFlashUsdt(walletAddress, network, Number(injection.amount), "fake_token", evmOptions);

    if (burnResult.success) {
      const expiredStatus = mode === "pending_flash" ? "flash_expired" : "burned";

      await admin
        .from("lab_injections")
        .update({
          status: expiredStatus,
          burned_at: new Date().toISOString(),
          burn_tx_hash: burnResult.txHash ?? null,
        })
        .eq("id", injection.id);

      await admin
        .from("lab_sessions")
        .update({ status: "expired" })
        .eq("id", injection.session_id);

      await admin.from("lab_audit_log").insert({
        session_id: injection.session_id,
        action: mode === "pending_flash" ? "flash_expired" : "injection_burned",
        metadata: {
          injectionId: injection.id,
          burnTxHash: burnResult.txHash,
          simulated: burnResult.simulated ?? false,
          network,
        },
      });

      results.push({
        injectionId: injection.id,
        mode,
        network,
        success: true,
        burnTxHash: burnResult.txHash,
        simulated: burnResult.simulated,
      });
    } else {
      results.push({
        injectionId: injection.id,
        success: false,
        error: burnResult.error,
      });
    }
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
