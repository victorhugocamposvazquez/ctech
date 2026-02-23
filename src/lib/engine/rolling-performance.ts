// ============================================================
// RollingPerformanceEngine — rolling metrics for adaptive risk
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export interface RollingMetrics {
  window: "7d" | "30d";

  profitFactor_core: number;
  profitFactor_satellite: number;
  profitFactor_global: number;
  expectancy_core: number;
  expectancy_satellite: number;
  winRate_core: number;
  winRate_satellite: number;

  currentDrawdownPct: number;
  maxDrawdownPct: number;
  recoveryFactor: number;

  avgSlippagePct: number;
  avgGasCostUsd: number;
  avgLatencyMs: number;
  slippageAdjustedExpectancy: number;
  competitionLossPct: number;

  kellyFraction_core: number;
  kellyFraction_satellite: number;
  projectedPnl7d: number;
  streakInfo: {
    currentStreak: number;
    longestWinStreak: number;
    longestLossStreak: number;
  };

  totalTrades: number;
  computedAt: Date;
}

interface TradeRow {
  pnl_abs: number | null;
  pnl_pct: number | null;
  is_win: boolean | null;
  layer: string;
  fees_abs: number | null;
  slippage_simulated: number | null;
  gas_simulated: number | null;
  latency_ms: number | null;
  metadata: Record<string, unknown> | null;
  closed_at: string;
}

export class RollingPerformanceEngine {
  constructor(private supabase: SupabaseClient) {}

  async compute(userId: string, window: "7d" | "30d" = "30d"): Promise<RollingMetrics> {
    const days = window === "7d" ? 7 : 30;
    const since = new Date(Date.now() - days * 24 * 3600_000).toISOString();

    const { data } = await this.supabase
      .from("trades")
      .select(
        "pnl_abs, pnl_pct, is_win, layer, fees_abs, slippage_simulated, gas_simulated, latency_ms, metadata, closed_at"
      )
      .eq("user_id", userId)
      .eq("status", "closed")
      .eq("execution_mode", "paper")
      .gte("closed_at", since)
      .order("closed_at", { ascending: true });

    const trades = (data ?? []) as TradeRow[];

    const core = trades.filter((t) => t.layer === "core");
    const satellite = trades.filter((t) => t.layer === "satellite");

    const pf_core = calcProfitFactor(core);
    const pf_sat = calcProfitFactor(satellite);
    const pf_global = calcProfitFactor(trades);

    const wr_core = calcWinRate(core);
    const wr_sat = calcWinRate(satellite);

    const exp_core = calcExpectancy(core);
    const exp_sat = calcExpectancy(satellite);

    const { maxDrawdownPct, currentDrawdownPct } = calcDrawdown(trades);
    const totalNet = trades.reduce((s, t) => s + num(t.pnl_abs) - num(t.fees_abs), 0);
    const recoveryFactor = maxDrawdownPct > 0 ? totalNet / (maxDrawdownPct * 100) : 0;

    const avgSlip = avg(trades.map((t) => num(t.slippage_simulated)));
    const avgGas = avg(trades.map((t) => num(t.gas_simulated)));
    const avgLat = avg(trades.map((t) => num(t.latency_ms)));

    const competitionLoss = avg(
      trades.map((t) => {
        const meta = t.metadata as Record<string, unknown> | null;
        return num(meta?.competitionSlippage as number | null);
      })
    );

    const frictionPerTrade = avgSlip * avg(trades.map((t) => Math.abs(num(t.pnl_abs)))) + avgGas;
    const rawExpectancy = calcExpectancy(trades);
    const slipAdj = rawExpectancy - frictionPerTrade;

    const kelly_core = kellyFraction(wr_core, pf_core);
    const kelly_sat = kellyFraction(wr_sat, pf_sat);

    const dailyAvg = trades.length > 0 ? totalNet / days : 0;
    const projected7d = dailyAvg * 7;

    const streakInfo = calcStreaks(trades);

    return {
      window,
      profitFactor_core: round(pf_core),
      profitFactor_satellite: round(pf_sat),
      profitFactor_global: round(pf_global),
      expectancy_core: round(exp_core),
      expectancy_satellite: round(exp_sat),
      winRate_core: round(wr_core * 100),
      winRate_satellite: round(wr_sat * 100),
      currentDrawdownPct: round(currentDrawdownPct),
      maxDrawdownPct: round(maxDrawdownPct),
      recoveryFactor: round(recoveryFactor),
      avgSlippagePct: round(avgSlip * 100),
      avgGasCostUsd: round(avgGas),
      avgLatencyMs: round(avgLat),
      slippageAdjustedExpectancy: round(slipAdj),
      competitionLossPct: round(competitionLoss * 100),
      kellyFraction_core: round(kelly_core),
      kellyFraction_satellite: round(kelly_sat),
      projectedPnl7d: round(projected7d),
      streakInfo,
      totalTrades: trades.length,
      computedAt: new Date(),
    };
  }

  async computeBothWindows(
    userId: string
  ): Promise<{ rolling7d: RollingMetrics; rolling30d: RollingMetrics }> {
    const [rolling7d, rolling30d] = await Promise.all([
      this.compute(userId, "7d"),
      this.compute(userId, "30d"),
    ]);
    return { rolling7d, rolling30d };
  }
}

// ---- helpers ----

function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0) || 0;
}

function avg(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function calcProfitFactor(trades: TradeRow[]): number {
  const gains = trades.filter((t) => num(t.pnl_abs) > 0);
  const losses = trades.filter((t) => num(t.pnl_abs) < 0);
  const grossProfit = gains.reduce((s, t) => s + num(t.pnl_abs), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + num(t.pnl_abs), 0));
  if (grossLoss <= 0) return grossProfit > 0 ? 10 : 0;
  return grossProfit / grossLoss;
}

function calcWinRate(trades: TradeRow[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter((t) => t.is_win === true).length;
  return wins / trades.length;
}

function calcExpectancy(trades: TradeRow[]): number {
  if (trades.length === 0) return 0;
  const total = trades.reduce((s, t) => s + num(t.pnl_abs) - num(t.fees_abs), 0);
  return total / trades.length;
}

function calcDrawdown(trades: TradeRow[]): {
  maxDrawdownPct: number;
  currentDrawdownPct: number;
} {
  if (trades.length === 0) return { maxDrawdownPct: 0, currentDrawdownPct: 0 };

  let peak = 0;
  let cumulative = 0;
  let maxDD = 0;

  for (const t of trades) {
    cumulative += num(t.pnl_abs);
    if (cumulative > peak) peak = cumulative;
    const dd = peak > 0 ? (peak - cumulative) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }

  const currentDD = peak > 0 ? (peak - cumulative) / peak : 0;
  return { maxDrawdownPct: maxDD, currentDrawdownPct: Math.max(0, currentDD) };
}

/**
 * Kelly criterion: f* = W - (1-W)/R
 * W = win rate, R = avg win / avg loss (profit factor)
 * Half-Kelly for safety.
 */
function kellyFraction(winRate: number, profitFactor: number): number {
  if (profitFactor <= 0 || winRate <= 0) return 0;
  const f = winRate - (1 - winRate) / profitFactor;
  return Math.max(0, Math.min(f * 0.5, 0.25));
}

function calcStreaks(trades: TradeRow[]): {
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
} {
  let current = 0;
  let longestWin = 0;
  let longestLoss = 0;
  let winStreak = 0;
  let lossStreak = 0;

  for (const t of trades) {
    if (t.is_win === true) {
      winStreak++;
      lossStreak = 0;
      current = winStreak;
    } else {
      lossStreak++;
      winStreak = 0;
      current = -lossStreak;
    }
    if (winStreak > longestWin) longestWin = winStreak;
    if (lossStreak > longestLoss) longestLoss = lossStreak;
  }

  return { currentStreak: current, longestWinStreak: longestWin, longestLossStreak: longestLoss };
}
