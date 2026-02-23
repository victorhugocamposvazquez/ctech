// ============================================================
// AdaptiveRiskGate — dynamic risk management based on rolling metrics
// ============================================================

import type { Layer, RiskConfig, RiskState, RiskVerdict } from "./types";
import { RiskGate } from "./risk-gate";
import type { RollingMetrics } from "./rolling-performance";

export interface AdaptiveRiskConfig {
  profitFactorFloor: number;
  profitFactorCeiling: number;
  expectancyNegativeStreak: number;
  drawdownPauseThreshold: number;
  drawdownAdaptiveFactor: number;
}

const DEFAULT_ADAPTIVE: AdaptiveRiskConfig = {
  profitFactorFloor: 0.8,
  profitFactorCeiling: 1.5,
  expectancyNegativeStreak: 5,
  drawdownPauseThreshold: 0.10,
  drawdownAdaptiveFactor: 5,
};

/**
 * AdaptiveRiskGate extends RiskGate by dynamically adjusting position sizing
 * based on real rolling performance, drawdown, and expectancy.
 *
 * When rolling metrics are available:
 *  - Low profit factor → reduces sizing by 50%
 *  - High profit factor → increases sizing by 25%
 *  - High drawdown → progressively scales down sizing
 *  - Extreme drawdown (>10%) → suggests pausing
 *
 * Falls back to base RiskGate behavior when metrics are not yet available.
 */
export class AdaptiveRiskGate extends RiskGate {
  private rollingMetrics: RollingMetrics | null = null;
  private adaptiveConfig: AdaptiveRiskConfig;

  constructor(
    baseConfig?: Partial<RiskConfig>,
    adaptiveConfig?: Partial<AdaptiveRiskConfig>
  ) {
    super(baseConfig);
    this.adaptiveConfig = { ...DEFAULT_ADAPTIVE, ...adaptiveConfig };
  }

  setRollingMetrics(metrics: RollingMetrics): void {
    this.rollingMetrics = metrics;
  }

  getRollingMetrics(): RollingMetrics | null {
    return this.rollingMetrics;
  }

  evaluate(state: RiskState, layer: Layer): RiskVerdict {
    const base = super.evaluate(state, layer);
    if (!base.allowed) return base;

    if (!this.rollingMetrics || this.rollingMetrics.totalTrades < 10) {
      return base;
    }

    let sizingMultiplier = 1.0;
    const reasons: string[] = [];

    const pf =
      layer === "core"
        ? this.rollingMetrics.profitFactor_core
        : this.rollingMetrics.profitFactor_satellite;

    if (pf < this.adaptiveConfig.profitFactorFloor) {
      sizingMultiplier *= 0.5;
      reasons.push(`PF bajo (${pf.toFixed(2)}) → sizing ×0.5`);
    } else if (pf > this.adaptiveConfig.profitFactorCeiling) {
      sizingMultiplier *= 1.25;
      reasons.push(`PF alto (${pf.toFixed(2)}) → sizing ×1.25`);
    }

    const ddPct = this.rollingMetrics.currentDrawdownPct;
    if (ddPct > this.adaptiveConfig.drawdownPauseThreshold) {
      return {
        allowed: false,
        reason: `Drawdown ${(ddPct * 100).toFixed(1)}% > umbral ${(this.adaptiveConfig.drawdownPauseThreshold * 100).toFixed(0)}% — pausa adaptativa`,
        maxPositionUsd: 0,
      };
    }

    if (ddPct > 0.03) {
      const ddReduction = Math.max(
        0.3,
        1 - ddPct * this.adaptiveConfig.drawdownAdaptiveFactor
      );
      sizingMultiplier *= ddReduction;
      reasons.push(`DD ${(ddPct * 100).toFixed(1)}% → sizing ×${ddReduction.toFixed(2)}`);
    }

    const kelly =
      layer === "core"
        ? this.rollingMetrics.kellyFraction_core
        : this.rollingMetrics.kellyFraction_satellite;

    if (kelly > 0) {
      const kellyCap = state.capital * kelly;
      const adjustedMax = Math.min(base.maxPositionUsd * sizingMultiplier, kellyCap);
      return {
        allowed: true,
        reason: reasons.length > 0 ? reasons.join("; ") : null,
        maxPositionUsd: Math.max(adjustedMax, 0),
      };
    }

    return {
      allowed: true,
      reason: reasons.length > 0 ? reasons.join("; ") : null,
      maxPositionUsd: Math.max(base.maxPositionUsd * sizingMultiplier, 0),
    };
  }
}
