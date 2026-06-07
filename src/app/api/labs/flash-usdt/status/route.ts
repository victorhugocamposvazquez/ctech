import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionForUser } from "@/lib/labs/lab-guard";
import {
  getFlashUsdtBalance,
  getTxStatus,
  getWalletUsdtOverview,
  isLabTronReady,
} from "@/lib/tron/flash-usdt-lab";
import { OFFICIAL_USDT_TRON } from "@/lib/tron/usdt-canonical";

/**
 * GET /api/labs/flash-usdt/status?sessionId=
 * Returns injection status, on-chain balance, TTL for current user.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId es obligatorio" }, { status: 400 });
  }

  const access = await getSessionForUser(supabase, sessionId, user.id);
  if (!access.session) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data: wallet } = await supabase
    .from("lab_wallets")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: injections } = await supabase
    .from("lab_injections")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  const userInjection = (injections ?? []).find((i) => i.user_id === user.id);

  let balance = null;
  let usdtOverview = null;
  if (wallet) {
    const injectionMode = (access.session.injection_mode ?? "fake_token") as import("@/lib/labs/types").LabInjectionMode;
    const simulatedAmount =
      userInjection?.status === "injected" || userInjection?.status === "pending_flash"
        ? Number(userInjection.amount)
        : undefined;
    const flashExpiresAt =
      (userInjection?.metadata as Record<string, unknown>)?.flashExpiresAt as string | undefined ??
      userInjection?.expires_at ??
      null;

    [balance, usdtOverview] = await Promise.all([
      getFlashUsdtBalance(wallet.tron_address),
      getWalletUsdtOverview(wallet.tron_address, {
        simulatedLabAmount: simulatedAmount,
        injectionMode,
        flashExpiresAt,
      }),
    ]);
  }

  let txStatus = null;
  if (userInjection?.tx_hash) {
    txStatus = await getTxStatus(userInjection.tx_hash);
  }

  let pendingTxStatus = null;
  if (userInjection?.pending_tx_hash) {
    pendingTxStatus = await getTxStatus(userInjection.pending_tx_hash);
  }

  const now = Date.now();
  const expiresAt = userInjection?.expires_at ?? access.session.expires_at;
  const ttlRemainingMs = expiresAt
    ? Math.max(0, new Date(expiresAt).getTime() - now)
    : null;

  if (access.isInstructor) {
    const { data: completions } = await supabase
      .from("lab_step_completions")
      .select("user_id, step_id, score")
      .eq("session_id", sessionId);

    const { data: enrolledWallets } = await supabase
      .from("lab_wallets")
      .select("id, user_id, tron_address, enrolled_at")
      .eq("session_id", sessionId);

    const participantProgress = (enrolledWallets ?? []).map((w) => {
      const userCompletions = (completions ?? []).filter((c) => c.user_id === w.user_id);
      const totalScore = userCompletions.reduce((s, c) => s + c.score, 0);
      const injection = (injections ?? []).find((i) => i.wallet_id === w.id);
      return {
        walletId: w.id,
        tronAddress: w.tron_address,
        enrolledAt: w.enrolled_at,
        injectionStatus: injection?.status ?? "none",
        stepsCompleted: userCompletions.length,
        totalScore,
      };
    });

    return NextResponse.json({
      session: access.session,
      isInstructor: true,
      wallet,
      injection: userInjection,
      balance,
      usdtOverview,
      txStatus,
      pendingTxStatus,
      injectionMode: access.session.injection_mode ?? "fake_token",
      ttlRemainingMs,
      tronConfigured: isLabTronReady(),
      officialUsdt: OFFICIAL_USDT_TRON,
      participantProgress,
      totalEnrolled: enrolledWallets?.length ?? 0,
      totalInjected: (injections ?? []).filter((i) =>
        i.status === "injected" || i.status === "pending_flash"
      ).length,
    });
  }

  return NextResponse.json({
    session: access.session,
    isInstructor: false,
    wallet,
    injection: userInjection,
    balance,
    usdtOverview,
    txStatus,
    pendingTxStatus,
    injectionMode: access.session.injection_mode ?? "fake_token",
    ttlRemainingMs,
    tronConfigured: isLabTronReady(),
    officialUsdt: OFFICIAL_USDT_TRON,
  });
}
