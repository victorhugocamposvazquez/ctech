import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertInstructor,
  checkInjectRateLimit,
  logLabAudit,
  getClientIp,
} from "@/lib/labs/lab-guard";
import {
  injectFlashUsdt,
  injectPendingFlashUsdt,
  isLabEvmReady,
} from "@/lib/evm/flash-usdt-lab";
import { getOfficialUsdtContractAddress } from "@/lib/evm/usdt-canonical";
import type { LabInjectionMode } from "@/lib/labs/types";

/**
 * POST /api/labs/flash-usdt/inject
 * Instructor triggers injection — mode from session (fake_token | pending_flash).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const authCheck = await assertInstructor(supabase, user.id);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const body = await req.json();
  const sessionId = String(body.sessionId ?? "").trim();
  const walletId = body.walletId ? String(body.walletId).trim() : null;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId es obligatorio" }, { status: 400 });
  }

  const rateErr = checkInjectRateLimit(sessionId);
  if (rateErr) {
    return NextResponse.json({ error: rateErr }, { status: 429 });
  }

  const { data: session } = await supabase
    .from("lab_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("instructor_id", user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  const injectionMode = (session.injection_mode ?? "fake_token") as LabInjectionMode;
  const flashDurationMinutes = Number(session.flash_duration_minutes ?? 30);

  let walletsQuery = supabase
    .from("lab_wallets")
    .select("*")
    .eq("session_id", sessionId);

  if (walletId) {
    walletsQuery = walletsQuery.eq("id", walletId);
  }

  const { data: wallets } = await walletsQuery;

  if (!wallets?.length) {
    return NextResponse.json({ error: "No hay wallets inscritas" }, { status: 400 });
  }

  const ttlMs =
    injectionMode === "pending_flash"
      ? flashDurationMinutes * 60 * 1000
      : session.ttl_hours * 3600 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const amount = Number(session.token_amount);
  const results = [];

  for (const wallet of wallets) {
    const { data: existingInjection } = await admin
      .from("lab_injections")
      .select("id, status")
      .eq("wallet_id", wallet.id)
      .in("status", ["injected", "pending_flash"])
      .maybeSingle();

    if (existingInjection) {
      results.push({
        walletId: wallet.id,
        walletAddress: wallet.wallet_address,
        skipped: true,
        reason: "Ya tiene inyección activa",
      });
      continue;
    }

    const { data: injectionRow } = await admin
      .from("lab_injections")
      .insert({
        session_id: sessionId,
        wallet_id: wallet.id,
        user_id: wallet.user_id,
        amount,
        expires_at: expiresAt,
        status: "pending",
        injection_mode: injectionMode,
      })
      .select("*")
      .single();

    const injectResult =
      injectionMode === "pending_flash"
        ? await injectPendingFlashUsdt(wallet.wallet_address, amount, flashDurationMinutes)
        : await injectFlashUsdt(wallet.wallet_address, amount);

    if (injectResult.success) {
      const successStatus =
        injectionMode === "pending_flash" ? "pending_flash" : "injected";

      await admin
        .from("lab_injections")
        .update({
          status: successStatus,
          tx_hash: injectResult.txHash ?? null,
          pending_tx_hash:
            "pendingTxHash" in injectResult ? injectResult.pendingTxHash ?? null : null,
          contract_address: injectResult.contractAddress ?? null,
          injected_at: new Date().toISOString(),
          metadata: {
            deliveryMethod: injectResult.deliveryMethod,
            pendingBaitContract: getOfficialUsdtContractAddress(),
            lastPendingBaitAt: new Date().toISOString(),
            pendingBaitRenewals: 0,
            flashExpiresAt:
              "flashExpiresAt" in injectResult ? injectResult.flashExpiresAt : null,
            flashBalance:
              "flashBalance" in injectResult ? injectResult.flashBalance : null,
          },
        })
        .eq("id", injectionRow!.id);

      results.push({
        walletId: wallet.id,
        walletAddress: wallet.wallet_address,
        success: true,
        mode: injectionMode,
        txHash: injectResult.txHash,
        pendingTxHash:
          "pendingTxHash" in injectResult ? injectResult.pendingTxHash : undefined,
        flashExpiresAt:
          "flashExpiresAt" in injectResult ? injectResult.flashExpiresAt : undefined,
        simulated: injectResult.simulated ?? false,
      });
    } else {
      await admin
        .from("lab_injections")
        .update({
          status: "failed",
          error_message: injectResult.error ?? "Error desconocido",
        })
        .eq("id", injectionRow!.id);

      results.push({
        walletId: wallet.id,
        walletAddress: wallet.wallet_address,
        success: false,
        error: injectResult.error,
      });
    }
  }

  await admin
    .from("lab_sessions")
    .update({ status: "injected", expires_at: expiresAt })
    .eq("id", sessionId);

  await admin.from("lab_audit_log").insert({
    user_id: user.id,
    session_id: sessionId,
    action:
      injectionMode === "pending_flash"
        ? "pending_flash_injected"
        : "flash_usdt_injected",
    metadata: {
      walletsProcessed: results.length,
      injectionMode,
      flashDurationMinutes,
      evmReady: isLabEvmReady(),
    },
    ip_address: getClientIp(req),
  });

  return NextResponse.json({
    sessionId,
    injectionMode,
    flashDurationMinutes,
    expiresAt,
    evmConfigured: isLabEvmReady(),
    results,
  });
}
