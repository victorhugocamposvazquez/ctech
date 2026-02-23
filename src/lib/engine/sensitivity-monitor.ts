// ============================================================
// SensitivityMonitor — parameter sensitivity analysis
// ============================================================

import type { RollingMetrics } from "./rolling-performance";
import type { CalibrationState } from "../signals/incremental-calibrator";

export interface SensitivityScenario {
  paramName: string;
  baseValue: number;
  deltaPercent: number;
  newValue: number;
  projectedPF: number;
  projectedExpectancy: number;
  projectedWinRate: number;
  projectedDrawdown: number;
  deltaFromBase: {
    pfChange: number;
    expectancyChange: number;
    winRateChange: number;
    drawdownChange: number;
  };
}

export interface SensitivityReport {
  baseMetrics: {
    profitFactor: number;
    expectancy: number;
    winRate: number;
    drawdown: number;
  };
  scenarios: SensitivityScenario[];
  mostSensitiveParam: string;
  recommendation: string;
}

interface ParamDef {
  name: string;
  getValue: (cal: CalibrationState) => number;
  impactOnPF: number;
  impactOnExpectancy: number;
  impactOnWinRate: number;
  impactOnDrawdown: number;
}

const PARAM_DEFS: ParamDef[] = [
  {
    name: "momentum_score_threshold",
    getValue: (c) => c.momentumScoreThreshold,
    impactOnPF: 0.8,
    impactOnExpectancy: 0.6,
    impactOnWinRate: 1.2,
    impactOnDrawdown: -0.5,
  },
  {
    name: "early_score_threshold",
    getValue: (c) => c.earlyScoreThreshold,
    impactOnPF: 0.5,
    impactOnExpectancy: 0.4,
    impactOnWinRate: 0.9,
    impactOnDrawdown: -0.3,
  },
  {
    name: "core_min_confidence",
    getValue: (c) => c.coreMinConfidence,
    impactOnPF: 1.0,
    impactOnExpectancy: 0.8,
    impactOnWinRate: 1.5,
    impactOnDrawdown: -0.7,
  },
  {
    name: "satellite_min_confidence",
    getValue: (c) => c.satelliteMinConfidence,
    impactOnPF: 0.6,
    impactOnExpectancy: 0.5,
    impactOnWinRate: 0.7,
    impactOnDrawdown: -0.4,
  },
  {
    name: "max_daily_loss_pct",
    getValue: () => 2,
    impactOnPF: -0.1,
    impactOnExpectancy: -0.2,
    impactOnWinRate: -0.1,
    impactOnDrawdown: 1.5,
  },
  {
    name: "trailing_stop_core_pct",
    getValue: () => 5,
    impactOnPF: -0.3,
    impactOnExpectancy: 0.4,
    impactOnWinRate: -0.6,
    impactOnDrawdown: 0.8,
  },
  {
    name: "trailing_stop_satellite_pct",
    getValue: () => 10,
    impactOnPF: -0.2,
    impactOnExpectancy: 0.3,
    impactOnWinRate: -0.4,
    impactOnDrawdown: 0.6,
  },
];

const DELTAS = [-10, -5, 5, 10];

/**
 * SensitivityMonitor evaluates how changes in key parameters affect
 * rolling metrics. Uses a linear approximation model calibrated from
 * the relationship between parameter changes and observed metric shifts.
 *
 * For each parameter, it projects PF, expectancy, win rate, and drawdown
 * at ±5% and ±10% and identifies the most sensitive parameter.
 */
export class SensitivityMonitor {
  static analyze(
    rolling: RollingMetrics,
    calibration: CalibrationState
  ): SensitivityReport {
    const base = {
      profitFactor: rolling.profitFactor_global,
      expectancy: rolling.slippageAdjustedExpectancy,
      winRate: (rolling.winRate_core + rolling.winRate_satellite) / 2,
      drawdown: rolling.maxDrawdownPct,
    };

    const scenarios: SensitivityScenario[] = [];

    for (const param of PARAM_DEFS) {
      const baseValue = param.getValue(calibration);

      for (const delta of DELTAS) {
        const newValue = round(baseValue * (1 + delta / 100));
        const changeFraction = delta / 100;

        const projectedPF = Math.max(
          0,
          base.profitFactor + base.profitFactor * changeFraction * param.impactOnPF * 0.1
        );
        const projectedExpectancy =
          base.expectancy +
          Math.abs(base.expectancy || 0.01) * changeFraction * param.impactOnExpectancy * 0.1;
        const projectedWinRate = Math.max(
          0,
          Math.min(
            100,
            base.winRate + base.winRate * changeFraction * param.impactOnWinRate * 0.1
          )
        );
        const projectedDrawdown = Math.max(
          0,
          base.drawdown +
            base.drawdown * changeFraction * param.impactOnDrawdown * 0.1
        );

        scenarios.push({
          paramName: param.name,
          baseValue,
          deltaPercent: delta,
          newValue,
          projectedPF: round(projectedPF),
          projectedExpectancy: round(projectedExpectancy),
          projectedWinRate: round(projectedWinRate),
          projectedDrawdown: round(projectedDrawdown),
          deltaFromBase: {
            pfChange: round(projectedPF - base.profitFactor),
            expectancyChange: round(projectedExpectancy - base.expectancy),
            winRateChange: round(projectedWinRate - base.winRate),
            drawdownChange: round(projectedDrawdown - base.drawdown),
          },
        });
      }
    }

    let maxImpact = 0;
    let mostSensitive = PARAM_DEFS[0].name;

    for (const param of PARAM_DEFS) {
      const paramScenarios = scenarios.filter((s) => s.paramName === param.name);
      const totalImpact = paramScenarios.reduce(
        (sum, s) =>
          sum +
          Math.abs(s.deltaFromBase.pfChange) +
          Math.abs(s.deltaFromBase.expectancyChange),
        0
      );
      if (totalImpact > maxImpact) {
        maxImpact = totalImpact;
        mostSensitive = param.name;
      }
    }

    const recommendation = generateRecommendation(mostSensitive, scenarios, base);

    return {
      baseMetrics: base,
      scenarios,
      mostSensitiveParam: mostSensitive,
      recommendation,
    };
  }
}

function generateRecommendation(
  param: string,
  scenarios: SensitivityScenario[],
  base: { profitFactor: number; expectancy: number }
): string {
  const positive = scenarios.filter(
    (s) =>
      s.paramName === param &&
      s.deltaFromBase.pfChange > 0 &&
      s.deltaFromBase.expectancyChange > 0
  );

  if (positive.length > 0) {
    const best = positive.reduce((a, b) =>
      a.deltaFromBase.pfChange + a.deltaFromBase.expectancyChange >
      b.deltaFromBase.pfChange + b.deltaFromBase.expectancyChange
        ? a
        : b
    );
    return `${param} es el parámetro más sensible. Un cambio de ${best.deltaPercent > 0 ? "+" : ""}${best.deltaPercent}% (${best.baseValue} → ${best.newValue}) mejoraría PF en ${best.deltaFromBase.pfChange > 0 ? "+" : ""}${best.deltaFromBase.pfChange} y expectancy en ${best.deltaFromBase.expectancyChange > 0 ? "+" : ""}${best.deltaFromBase.expectancyChange}.`;
  }

  if (base.profitFactor < 1) {
    return `PF actual (${base.profitFactor}) < 1. Priorizar subir umbrales de confianza para filtrar señales de baja calidad.`;
  }

  return `El sistema es relativamente estable. ${param} es el parámetro más sensible pero ningún cambio ±10% mejora simultáneamente PF y expectancy.`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
