import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { burnFlashUsdt, clearFlashCredit } from "@/lib/tron/flash-usdt-lab";
import type { LabInjectionMode } from "@/lib/labs/types";

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
    .select("id, session_id, wallet_id, amount, injection_mode, lab_wallets(tron_address)")
    .in("status", ["injected", "pending_flash"])
    .is("burned_at", null)
    .lte("expires_at", now);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];

  for (const injection of expired ?? []) {
    const walletRaw = injection.lab_wallets as
      | { tron_address: string }
      | { tron_address: string }[]
      | null;
    const wallet = Array.isArray(walletRaw) ? walletRaw[0] : walletRaw;
    const tronAddress = wallet?.tron_address;
    const mode = (injection.injection_mode ?? "fake_token") as LabInjectionMode;

    if (!tronAddress) {
      results.push({ injectionId: injection.id, success: false, error: "Wallet no encontrada" });
      continue;
    }

    const burnResult =
      mode === "pending_flash"
        ? await clearFlashCredit(tronAddress)
        : await burnFlashUsdt(tronAddress, Number(injection.amount), "fake_token");

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
        },
      });

      results.push({
        injectionId: injection.id,
        mode,
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
