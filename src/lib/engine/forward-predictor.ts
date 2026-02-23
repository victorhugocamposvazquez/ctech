// ============================================================
// ForwardPredictor — Monte Carlo drawdown & streak prediction
// ============================================================

import type { RollingMetrics } from "./rolling-performance";

export interface ForwardPrediction {
  window: "7d" | "30d";
  simulations: number;

  expectedPnl: number;
  pnlP10: number;
  pnlP25: number;
  pnlMedian: number;
  pnlP75: number;
  pnlP90: number;

  maxDrawdownExpected: number;
  drawdownP90: number;
  drawdownP95: number;
  probDrawdownOver5Pct: number;
  probDrawdownOver10Pct: number;

  expectedLossStreak: number;
  lossStreakP90: number;
  probStreakOver5: number;

  probPositivePnl: number;
  probReturn2xDaily: number;

  riskOfRuin5Pct: number;
}

const DEFAULT_SIMS = 5_000;
const TRADES_PER_DAY = 3;

/**
 * ForwardPredictor uses Monte Carlo simulation over recent trade distribution
 * to project drawdown, streak, and PnL distributions forward.
 *
 * Method:
 *  1. Extract trade-level PnL distribution from rolling metrics
 *  2. Generate synthetic trade sequences for N days
 *  3. Compute path-level drawdown, streaks, PnL
 *  4. Aggregate into percentiles and probabilities
 *
 * Uses a modified Student-t distribution for fat tails (DeFi reality).
 */
export class ForwardPredictor {
  static predict(
    rolling: RollingMetrics,
    window: "7d" | "30d" = "7d",
    capitalUsd = 10_000,
    simulations = DEFAULT_SIMS
  ): ForwardPrediction {
    const days = window === "7d" ? 7 : 30;
    const totalTrades = days * TRADES_PER_DAY;

    const winRate = Math.max(
      0.1,
      Math.min(
        0.9,
        ((rolling.winRate_core + rolling.winRate_satellite) / 2) / 100
      )
    );
    const avgWin = rolling.profitFactor_global > 0
      ? Math.abs(rolling.slippageAdjustedExpectancy) * rolling.profitFactor_global
      : 0.005 * capitalUsd;
    const avgLoss = rolling.profitFactor_global > 0
      ? Math.abs(rolling.slippageAdjustedExpectancy)
      : 0.003 * capitalUsd;

    const winStdDev = avgWin * 0.6;
    const lossStdDev = avgLoss * 0.5;

    const pnlPaths: number[] = [];
    const maxDDPaths: number[] = [];
    const maxLossStreaks: number[] = [];

    for (let sim = 0; sim < simulations; sim++) {
      let cumPnl = 0;
      let peak = 0;
      let maxDD = 0;
      let lossStreak = 0;
      let maxLossStreak = 0;

      for (let t = 0; t < totalTrades; t++) {
        const isWin = Math.random() < winRate;
        let tradePnl: number;

        if (isWin) {
          tradePnl = Math.abs(sampleStudentT(avgWin, winStdDev, 3));
          lossStreak = 0;
        } else {
          tradePnl = -Math.abs(sampleStudentT(avgLoss, lossStdDev, 3));
          lossStreak++;
          if (lossStreak > maxLossStreak) maxLossStreak = lossStreak;
        }

        const friction =
          (rolling.avgSlippagePct / 100) * Math.abs(tradePnl) +
          rolling.avgGasCostUsd;
        cumPnl += tradePnl - friction;

        if (cumPnl > peak) peak = cumPnl;
        const dd = peak > 0 ? (peak - cumPnl) / peak : 0;
        if (dd > maxDD) maxDD = dd;
      }

      pnlPaths.push(cumPnl);
      maxDDPaths.push(maxDD);
      maxLossStreaks.push(maxLossStreak);
    }

    pnlPaths.sort((a, b) => a - b);
    maxDDPaths.sort((a, b) => a - b);
    maxLossStreaks.sort((a, b) => a - b);

    const pctile = (arr: number[], p: number) => arr[Math.floor(arr.length * p)] ?? 0;

    return {
      window,
      simulations,

      expectedPnl: round(avg(pnlPaths)),
      pnlP10: round(pctile(pnlPaths, 0.1)),
      pnlP25: round(pctile(pnlPaths, 0.25)),
      pnlMedian: round(pctile(pnlPaths, 0.5)),
      pnlP75: round(pctile(pnlPaths, 0.75)),
      pnlP90: round(pctile(pnlPaths, 0.9)),

      maxDrawdownExpected: round(avg(maxDDPaths) * 100),
      drawdownP90: round(pctile(maxDDPaths, 0.9) * 100),
      drawdownP95: round(pctile(maxDDPaths, 0.95) * 100),
      probDrawdownOver5Pct: round(
        (maxDDPaths.filter((d) => d > 0.05).length / simulations) * 100
      ),
      probDrawdownOver10Pct: round(
        (maxDDPaths.filter((d) => d > 0.10).length / simulations) * 100
      ),

      expectedLossStreak: round(avg(maxLossStreaks)),
      lossStreakP90: pctile(maxLossStreaks, 0.9),
      probStreakOver5: round(
        (maxLossStreaks.filter((s) => s > 5).length / simulations) * 100
      ),

      probPositivePnl: round(
        (pnlPaths.filter((p) => p > 0).length / simulations) * 100
      ),
      probReturn2xDaily: round(
        (pnlPaths.filter((p) => p > capitalUsd * 0.001 * days).length / simulations) * 100
      ),

      riskOfRuin5Pct: round(
        (pnlPaths.filter((p) => p < -capitalUsd * 0.05).length / simulations) * 100
      ),
    };
  }
}

/**
 * Sample from Student-t distribution (fat tails).
 * Uses Box-Muller + chi-squared scaling.
 */
function sampleStudentT(mean: number, stdDev: number, df: number): number {
  const z = boxMuller();
  let chi2 = 0;
  for (let i = 0; i < df; i++) {
    const u = boxMuller();
    chi2 += u * u;
  }
  const t = z / Math.sqrt(chi2 / df);
  return mean + stdDev * t;
}

function boxMuller(): number {
  let u1: number, u2: number;
  do {
    u1 = Math.random();
  } while (u1 === 0);
  u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
