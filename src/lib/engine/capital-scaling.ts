// ============================================================
// CapitalScalingSimulator — edge decay with growing capital
// ============================================================

import type { RollingMetrics } from "./rolling-performance";

export interface CapitalScalingPoint {
  capitalUsd: number;
  effectiveEdgePct: number;
  avgSlippagePct: number;
  poolSaturationPct: number;
  maxPositionUsd: number;
  impactOnCoreCount: number;
  impactOnSatelliteCount: number;
  profitFactorProjected: number;
  monthlyPnlProjected: number;
}

export interface CapitalScalingReport {
  currentCapital: number;
  optimalCapital: number;
  saturationCapital: number;
  edgeBreakevenCapital: number;
  scalingCurve: CapitalScalingPoint[];
  recommendation: string;
}

/**
 * CapitalScalingSimulator models how edge (expectancy, PF)
 * degrades as portfolio capital increases.
 *
 * Key insight: in DeFi micro/small-cap pools, position size relative
 * to liquidity drives slippage non-linearly. A $50 trade in a $100K pool
 * is invisible, but a $5K trade moves the price meaningfully.
 *
 * The model:
 *  - Takes current rolling metrics as baseline edge at current capital
 *  - Projects slippage growth as capital → larger positions
 *  - Accounts for pool count limitations (can't diversify infinitely)
 *  - Finds the optimal capital where edge is maximized
 *  - Finds saturation capital where edge drops to zero
 */
export class CapitalScalingSimulator {
  static analyze(
    currentCapital: number,
    rolling: RollingMetrics,
    avgPoolLiquidityUsd = 200_000,
    avgTradesPerDay = 3
  ): CapitalScalingReport {
    const baseEdge = rolling.slippageAdjustedExpectancy;
    const basePF = rolling.profitFactor_global;
    const baseSlippage = rolling.avgSlippagePct / 100;

    const steps = [
      500, 1000, 2500, 5000, 10000, 25000, 50000,
      100_000, 250_000, 500_000, 1_000_000,
    ];

    const curve: CapitalScalingPoint[] = [];
    let optimalCapital = currentCapital;
    let maxEdge = -Infinity;
    let saturationCapital = steps[steps.length - 1];
    let edgeBreakevenCapital = steps[steps.length - 1];
    let foundBreakeven = false;

    for (const cap of steps) {
      const point = projectAtCapital(
        cap,
        currentCapital,
        baseEdge,
        basePF,
        baseSlippage,
        avgPoolLiquidityUsd,
        avgTradesPerDay
      );
      curve.push(point);

      if (point.effectiveEdgePct > maxEdge) {
        maxEdge = point.effectiveEdgePct;
        optimalCapital = cap;
      }

      if (point.effectiveEdgePct <= 0 && !foundBreakeven) {
        edgeBreakevenCapital = cap;
        foundBreakeven = true;
      }

      if (point.poolSaturationPct >= 80) {
        saturationCapital = cap;
      }
    }

    const recommendation = generateRec(
      currentCapital,
      optimalCapital,
      edgeBreakevenCapital,
      maxEdge
    );

    return {
      currentCapital,
      optimalCapital,
      saturationCapital,
      edgeBreakevenCapital,
      scalingCurve: curve,
      recommendation,
    };
  }
}

function projectAtCapital(
  capital: number,
  currentCapital: number,
  baseEdge: number,
  basePF: number,
  baseSlippage: number,
  avgPoolLiq: number,
  avgTradesPerDay: number
): CapitalScalingPoint {
  const coreRiskPct = 0.005;
  const satRiskPct = 0.0025;
  const maxPoolImpactCore = 0.005;
  const maxPoolImpactSat = 0.003;

  const corePositionRaw = capital * coreRiskPct;
  const satPositionRaw = capital * satRiskPct;

  const corePoolCap = avgPoolLiq * maxPoolImpactCore;
  const satPoolCap = avgPoolLiq * maxPoolImpactSat;

  const maxCorePosition = Math.min(corePositionRaw, corePoolCap);
  const maxSatPosition = Math.min(satPositionRaw, satPoolCap);
  const maxPosition = Math.max(maxCorePosition, maxSatPosition);

  const depthRatioCore = maxCorePosition / avgPoolLiq;
  const depthRatioSat = maxSatPosition / avgPoolLiq;

  const slippageCore =
    baseSlippage + depthRatioCore * 2 + Math.pow(depthRatioCore, 2) * 10;
  const slippageSat =
    baseSlippage + depthRatioSat * 2.5 + Math.pow(depthRatioSat, 2) * 15;
  const avgSlippage = (slippageCore + slippageSat) / 2;

  const scaleFactor = capital / Math.max(currentCapital, 1);
  const slippageDrag = (avgSlippage - baseSlippage) * capital * avgTradesPerDay * 30;
  const baseMonthlyPnl =
    baseEdge * avgTradesPerDay * 30 * Math.min(scaleFactor, Math.sqrt(scaleFactor));
  const projectedMonthlyPnl = baseMonthlyPnl - slippageDrag;

  const effectiveEdge =
    capital > 0 && avgTradesPerDay > 0
      ? projectedMonthlyPnl / (capital * avgTradesPerDay * 30)
      : 0;

  const poolSaturation =
    capital > 0 ? Math.min((maxPosition / (capital * coreRiskPct)) * 100, 100) : 0;

  const pfDecay = Math.max(0, 1 - avgSlippage * 5);
  const projectedPF = basePF * pfDecay;

  const impactOnCore = corePositionRaw > corePoolCap
    ? Math.max(0, Math.floor(avgTradesPerDay * 0.6 * (corePoolCap / corePositionRaw)))
    : Math.floor(avgTradesPerDay * 0.6);

  const impactOnSatellite = satPositionRaw > satPoolCap
    ? Math.max(0, Math.floor(avgTradesPerDay * 0.4 * (satPoolCap / satPositionRaw)))
    : Math.floor(avgTradesPerDay * 0.4);

  return {
    capitalUsd: capital,
    effectiveEdgePct: round(effectiveEdge * 100),
    avgSlippagePct: round(avgSlippage * 100),
    poolSaturationPct: round(100 - poolSaturation),
    maxPositionUsd: round(maxPosition),
    impactOnCoreCount: impactOnCore,
    impactOnSatelliteCount: impactOnSatellite,
    profitFactorProjected: round(projectedPF),
    monthlyPnlProjected: round(projectedMonthlyPnl),
  };
}

function generateRec(
  current: number,
  optimal: number,
  breakeven: number,
  maxEdge: number
): string {
  if (maxEdge <= 0) {
    return "Edge negativo en todos los niveles de capital. Revisar estrategia antes de escalar.";
  }
  if (current < optimal * 0.5) {
    return `Capital actual ($${current.toLocaleString()}) muy bajo. Óptimo: $${optimal.toLocaleString()} donde el edge alcanza ${maxEdge.toFixed(3)}%.`;
  }
  if (current > breakeven * 0.8) {
    return `Capital actual ($${current.toLocaleString()}) cerca del breakeven ($${breakeven.toLocaleString()}). Considerar reducir o diversificar en pools más líquidos.`;
  }
  if (current >= optimal * 0.8 && current <= optimal * 1.2) {
    return `Capital actual ($${current.toLocaleString()}) está en la zona óptima ($${optimal.toLocaleString()}). Edge máximo: ${maxEdge.toFixed(3)}%.`;
  }
  return `Óptimo: $${optimal.toLocaleString()}. Breakeven: $${breakeven.toLocaleString()}. Ajustar gradualmente.`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
