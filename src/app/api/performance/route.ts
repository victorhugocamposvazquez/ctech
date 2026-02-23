import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/performance — métricas de rendimiento del paper trading.
 *
 * Devuelve:
 *  - KPIs globales: expectancy, profit factor, win rate, max drawdown
 *  - Desglose Core vs Satellite
 *  - Estado de riesgo actual
 *  - Posiciones abiertas
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [closedResult, openResult, riskResult] = await Promise.all([
    supabase
      .from("trades")
      .select("pnl_abs, pnl_pct, is_win, layer, fees_abs, execution_mode, closed_at")
      .eq("user_id", user.id)
      .eq("status", "closed")
      .eq("execution_mode", "paper"),
    supabase
      .from("trades")
      .select("id, symbol, layer, entry_price, quantity, metadata, opened_at")
      .eq("user_id", user.id)
      .eq("status", "open")
      .eq("execution_mode", "paper"),
    supabase
      .from("risk_state")
      .select("*")
      .eq("user_id", user.id)
      .single(),
  ]);

  const closed = closedResult.data ?? [];
  const open = openResult.data ?? [];

  const core = closed.filter((t) => t.layer === "core");
  const satellite = closed.filter((t) => t.layer === "satellite");

  return NextResponse.json({
    global: calcMetrics(closed),
    core: calcMetrics(core),
    satellite: calcMetrics(satellite),
    openPositions: open.length,
    riskState: riskResult.data
      ? {
          capital: Number(riskResult.data.capital),
          pnlToday: Number(riskResult.data.pnl_today),
          pnlThisWeek: Number(riskResult.data.pnl_this_week),
          tradesTodayCore: riskResult.data.trades_today_core,
          tradesTodaySatellite: riskResult.data.trades_today_satellite,
          isPaused: riskResult.data.is_paused,
          pauseReason: riskResult.data.pause_reason,
        }
      : null,
  });
}

function calcMetrics(trades: { pnl_abs: unknown; pnl_pct: unknown; is_win: unknown; fees_abs: unknown }[]) {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalPnl: 0,
      totalFees: 0,
      netPnl: 0,
      avgPnlPct: 0,
      profitFactor: 0,
      expectancy: 0,
      maxDrawdown: 0,
      bestTrade: 0,
      worstTrade: 0,
    };
  }

  const pnls = trades.map((t) => Number(t.pnl_abs ?? 0));
  const pnlPcts = trades.map((t) => Number(t.pnl_pct ?? 0));
  const fees = trades.map((t) => Number(t.fees_abs ?? 0));

  const wins = trades.filter((t) => t.is_win === true).length;
  const losses = trades.length - wins;
  const winRate = trades.length > 0 ? wins / trades.length : 0;

  const totalPnl = pnls.reduce((s, v) => s + v, 0);
  const totalFees = fees.reduce((s, v) => s + v, 0);
  const netPnl = totalPnl - totalFees;

  const avgPnlPct =
    pnlPcts.length > 0 ? pnlPcts.reduce((s, v) => s + v, 0) / pnlPcts.length : 0;

  const grossProfit = pnls.filter((v) => v > 0).reduce((s, v) => s + v, 0);
  const grossLoss = Math.abs(pnls.filter((v) => v < 0).reduce((s, v) => s + v, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 10 : 0;

  const expectancy = trades.length > 0 ? netPnl / trades.length : 0;

  // Max drawdown (equity curve)
  let peak = 0;
  let cumulative = 0;
  let maxDrawdown = 0;
  for (const pnl of pnls) {
    cumulative += pnl;
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    totalTrades: trades.length,
    wins,
    losses,
    winRate: Math.round(winRate * 10000) / 100,
    totalPnl: round(totalPnl),
    totalFees: round(totalFees),
    netPnl: round(netPnl),
    avgPnlPct: round(avgPnlPct * 100),
    profitFactor: round(profitFactor),
    expectancy: round(expectancy),
    maxDrawdown: round(maxDrawdown),
    bestTrade: round(Math.max(...pnls)),
    worstTrade: round(Math.min(...pnls)),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
