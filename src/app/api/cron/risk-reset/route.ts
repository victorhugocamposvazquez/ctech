import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/cron/risk-reset — ejecutado por Vercel Cron a las 00:00 UTC diario.
 *
 * Reset diario:
 *  - pnl_today → 0
 *  - trades_today_core → 0
 *  - trades_today_satellite → 0
 *  - Limpiar pausas expiradas
 *
 * Reset semanal (lunes):
 *  - pnl_this_week → 0
 *  - consecutive_losses_satellite → 0
 */
export async function GET(req: Request) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const now = new Date();
  const isMonday = now.getUTCDay() === 1;

  // Reset diario para todos los usuarios
  const dailyUpdate: Record<string, unknown> = {
    pnl_today: 0,
    trades_today_core: 0,
    trades_today_satellite: 0,
    last_daily_reset_at: now.toISOString(),
  };

  if (isMonday) {
    dailyUpdate.pnl_this_week = 0;
    dailyUpdate.consecutive_losses_satellite = 0;
    dailyUpdate.last_weekly_reset_at = now.toISOString();
  }

  const { error: resetError, count } = await supabase
    .from("risk_state")
    .update(dailyUpdate)
    .neq("user_id", "00000000-0000-0000-0000-000000000000")
    .select("id");

  // Limpiar pausas expiradas
  const { error: unpauseError } = await supabase
    .from("risk_state")
    .update({
      is_paused: false,
      pause_reason: null,
      pause_until: null,
    })
    .eq("is_paused", true)
    .lte("pause_until", now.toISOString());

  return NextResponse.json({
    timestamp: now.toISOString(),
    isMonday,
    dailyReset: !resetError,
    weeklyReset: isMonday && !resetError,
    usersReset: count ?? 0,
    unpauseError: unpauseError?.message ?? null,
  });
}

function verifyCronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}
