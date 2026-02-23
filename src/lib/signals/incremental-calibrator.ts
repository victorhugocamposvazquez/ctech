// ============================================================
// IncrementalCalibrator — auto-tuning signal thresholds
// v2: exposure-aware + cross-detector interaction
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export interface CalibrationState {
  momentumScoreThreshold: number;
  earlyScoreThreshold: number;
  coreMinConfidence: number;
  satelliteMinConfidence: number;
  hitRate24h_core: number;
  hitRate24h_satellite: number;
  avgPnl24h: number;
  profitFactor_rolling: number;
  expectancy_rolling: number;
  lastCalibratedAt: Date;
  exposureMomentumPct: number;
  exposureEarlyPct: number;
  detectorInteraction: DetectorInteraction;
}

export interface DetectorInteraction {
  momentumPF: number;
  earlyPF: number;
  momentumHitRate: number;
  earlyHitRate: number;
  overlapPct: number;
  recommendedBias: "momentum" | "early" | "balanced";
}

const TARGET_HIT_RATE_CORE = 0.55;
const TARGET_HIT_RATE_SAT = 0.40;
const BASE_STEP = 2;
const MIN_OUTCOMES = 20;
const EXPOSURE_CAP_PCT = 70;

/**
 * IncrementalCalibrator v2:
 *
 *  Original logic:
 *  - Adjust thresholds based on hit rate vs target
 *  - Small step sizes to avoid oscillation
 *
 *  New in v2:
 *  - Tracks cumulative exposure per detector (momentum vs early)
 *  - If one detector dominates exposure (>70%), dampens its thresholds
 *    and opens the other to rebalance
 *  - Computes per-detector profit factor to identify which pipeline
 *    generates better risk-adjusted returns
 *  - Cross-detector overlap detection (tokens found by both)
 *  - Adaptive step size: larger when metrics diverge far from target,
 *    smaller when close to optimal
 */
export class IncrementalCalibrator {
  constructor(private supabase: SupabaseClient) {}

  async recalibrate(userId: string): Promise<CalibrationState | null> {
    const { data: outcomes } = await this.supabase
      .from("signal_outcomes")
      .select("layer, pnl_pct_24h, confidence, was_executed, signal_source, metadata")
      .eq("user_id", userId)
      .not("pnl_pct_24h", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!outcomes || outcomes.length < MIN_OUTCOMES) return null;

    const coreOutcomes = outcomes.filter((o) => o.layer === "core");
    const satOutcomes = outcomes.filter((o) => o.layer === "satellite");

    const hitRate_core = calcHitRate(coreOutcomes);
    const hitRate_sat = calcHitRate(satOutcomes);
    const avgPnl24h = calcAvgPnl(outcomes);
    const { profitFactor, expectancy } = calcPfAndExp(outcomes);

    const momentumOutcomes = outcomes.filter(
      (o) => extractSource(o) === "momentum"
    );
    const earlyOutcomes = outcomes.filter(
      (o) => extractSource(o) === "early"
    );

    const interaction = computeDetectorInteraction(momentumOutcomes, earlyOutcomes, outcomes);
    const exposure = computeExposure(momentumOutcomes, earlyOutcomes, outcomes);

    const current = await this.getCurrentState(userId);

    let momThreshold = current?.momentumScoreThreshold ?? 55;
    let earlyThreshold = current?.earlyScoreThreshold ?? 50;
    let coreConf = current?.coreMinConfidence ?? 75;
    let satConf = current?.satelliteMinConfidence ?? 50;

    const coreStep = adaptiveStep(hitRate_core, TARGET_HIT_RATE_CORE);
    const satStep = adaptiveStep(hitRate_sat, TARGET_HIT_RATE_SAT);

    if (hitRate_core < TARGET_HIT_RATE_CORE && coreOutcomes.length >= 10) {
      momThreshold = Math.min(momThreshold + coreStep, 80);
      coreConf = Math.min(coreConf + coreStep, 90);
    } else if (hitRate_core > TARGET_HIT_RATE_CORE + 0.15 && coreOutcomes.length >= 10) {
      momThreshold = Math.max(momThreshold - coreStep, 40);
      coreConf = Math.max(coreConf - coreStep, 60);
    }

    if (hitRate_sat < TARGET_HIT_RATE_SAT && satOutcomes.length >= 10) {
      earlyThreshold = Math.min(earlyThreshold + satStep, 70);
      satConf = Math.min(satConf + satStep, 70);
    } else if (hitRate_sat > TARGET_HIT_RATE_SAT + 0.15 && satOutcomes.length >= 10) {
      earlyThreshold = Math.max(earlyThreshold - satStep, 35);
      satConf = Math.max(satConf - satStep, 35);
    }

    if (exposure.momentumPct > EXPOSURE_CAP_PCT && interaction.earlyPF > interaction.momentumPF) {
      momThreshold = Math.min(momThreshold + 1, 80);
      earlyThreshold = Math.max(earlyThreshold - 1, 35);
    } else if (exposure.earlyPct > EXPOSURE_CAP_PCT && interaction.momentumPF > interaction.earlyPF) {
      earlyThreshold = Math.min(earlyThreshold + 1, 70);
      momThreshold = Math.max(momThreshold - 1, 40);
    }

    if (interaction.recommendedBias === "momentum" && interaction.momentumPF > 1.5) {
      coreConf = Math.max(coreConf - 1, 60);
    } else if (interaction.recommendedBias === "early" && interaction.earlyPF > 1.5) {
      satConf = Math.max(satConf - 1, 35);
    }

    const state: CalibrationState = {
      momentumScoreThreshold: momThreshold,
      earlyScoreThreshold: earlyThreshold,
      coreMinConfidence: coreConf,
      satelliteMinConfidence: satConf,
      hitRate24h_core: round(hitRate_core),
      hitRate24h_satellite: round(hitRate_sat),
      avgPnl24h: round(avgPnl24h),
      profitFactor_rolling: round(profitFactor),
      expectancy_rolling: round(expectancy),
      lastCalibratedAt: new Date(),
      exposureMomentumPct: round(exposure.momentumPct),
      exposureEarlyPct: round(exposure.earlyPct),
      detectorInteraction: interaction,
    };

    await this.persistState(userId, state);
    return state;
  }

  async getCurrentState(userId: string): Promise<CalibrationState | null> {
    const { data } = await this.supabase
      .from("calibration_state")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!data) return null;

    return {
      momentumScoreThreshold: Number(data.momentum_score_threshold),
      earlyScoreThreshold: Number(data.early_score_threshold),
      coreMinConfidence: Number(data.core_min_confidence),
      satelliteMinConfidence: Number(data.satellite_min_confidence),
      hitRate24h_core: Number(data.hit_rate_24h_core),
      hitRate24h_satellite: Number(data.hit_rate_24h_satellite),
      avgPnl24h: Number(data.avg_pnl_24h ?? 0),
      profitFactor_rolling: Number(data.profit_factor_rolling),
      expectancy_rolling: Number(data.expectancy_rolling),
      lastCalibratedAt: new Date(data.calibrated_at),
      exposureMomentumPct: Number(data.exposure_momentum_pct ?? 50),
      exposureEarlyPct: Number(data.exposure_early_pct ?? 50),
      detectorInteraction: (data.detector_interaction as DetectorInteraction) ?? {
        momentumPF: 0, earlyPF: 0, momentumHitRate: 0, earlyHitRate: 0,
        overlapPct: 0, recommendedBias: "balanced",
      },
    };
  }

  private async persistState(userId: string, state: CalibrationState): Promise<void> {
    await this.supabase
      .from("calibration_state")
      .upsert(
        {
          user_id: userId,
          momentum_score_threshold: state.momentumScoreThreshold,
          early_score_threshold: state.earlyScoreThreshold,
          core_min_confidence: state.coreMinConfidence,
          satellite_min_confidence: state.satelliteMinConfidence,
          hit_rate_24h_core: state.hitRate24h_core,
          hit_rate_24h_satellite: state.hitRate24h_satellite,
          avg_pnl_24h: state.avgPnl24h,
          profit_factor_rolling: state.profitFactor_rolling,
          expectancy_rolling: state.expectancy_rolling,
          calibrated_at: state.lastCalibratedAt.toISOString(),
          exposure_momentum_pct: state.exposureMomentumPct,
          exposure_early_pct: state.exposureEarlyPct,
          detector_interaction: state.detectorInteraction,
        },
        { onConflict: "user_id" }
      );
  }
}

// ---- helpers ----

type Outcome = {
  pnl_pct_24h: unknown;
  signal_source?: unknown;
  metadata?: unknown;
};

function extractSource(o: Outcome): "momentum" | "early" | "unknown" {
  const src = (o.signal_source as string) ?? "";
  if (src.includes("momentum") || src.includes("trending")) return "momentum";
  if (src.includes("early")) return "early";
  const meta = o.metadata as Record<string, unknown> | null;
  if (meta?.signalSource) {
    const ms = String(meta.signalSource);
    if (ms.includes("momentum") || ms.includes("trending")) return "momentum";
    if (ms.includes("early")) return "early";
  }
  return "unknown";
}

function computeDetectorInteraction(
  momentum: Outcome[],
  early: Outcome[],
  all: Outcome[]
): DetectorInteraction {
  const momPF = calcPfAndExp(momentum).profitFactor;
  const earlyPF = calcPfAndExp(early).profitFactor;
  const momHR = calcHitRate(momentum);
  const earlyHR = calcHitRate(early);

  const momTokens = new Set(
    momentum.map((o) => {
      const meta = o.metadata as Record<string, unknown> | null;
      return String(meta?.tokenAddress ?? "");
    }).filter(Boolean)
  );
  const earlyTokens = new Set(
    early.map((o) => {
      const meta = o.metadata as Record<string, unknown> | null;
      return String(meta?.tokenAddress ?? "");
    }).filter(Boolean)
  );
  const overlap = [...momTokens].filter((t) => earlyTokens.has(t)).length;
  const totalUnique = new Set([...momTokens, ...earlyTokens]).size;
  const overlapPct = totalUnique > 0 ? (overlap / totalUnique) * 100 : 0;

  const momScore = momPF * 0.6 + momHR * 0.4;
  const earlyScore = earlyPF * 0.6 + earlyHR * 0.4;
  const diff = Math.abs(momScore - earlyScore);

  let bias: "momentum" | "early" | "balanced" = "balanced";
  if (diff > 0.3 && all.length >= 30) {
    bias = momScore > earlyScore ? "momentum" : "early";
  }

  return {
    momentumPF: round(momPF),
    earlyPF: round(earlyPF),
    momentumHitRate: round(momHR),
    earlyHitRate: round(earlyHR),
    overlapPct: round(overlapPct),
    recommendedBias: bias,
  };
}

function computeExposure(
  momentum: Outcome[],
  early: Outcome[],
  all: Outcome[]
): { momentumPct: number; earlyPct: number } {
  const total = all.length || 1;
  return {
    momentumPct: round((momentum.length / total) * 100),
    earlyPct: round((early.length / total) * 100),
  };
}

function adaptiveStep(actual: number, target: number): number {
  const gap = Math.abs(actual - target);
  if (gap > 0.20) return BASE_STEP + 2;
  if (gap > 0.10) return BASE_STEP + 1;
  return BASE_STEP;
}

function calcHitRate(outcomes: Array<{ pnl_pct_24h: unknown }>): number {
  if (outcomes.length === 0) return 0;
  const hits = outcomes.filter((o) => Number(o.pnl_pct_24h ?? 0) > 0).length;
  return hits / outcomes.length;
}

function calcAvgPnl(outcomes: Array<{ pnl_pct_24h: unknown }>): number {
  if (outcomes.length === 0) return 0;
  const sum = outcomes.reduce((s, o) => s + Number(o.pnl_pct_24h ?? 0), 0);
  return sum / outcomes.length;
}

function calcPfAndExp(outcomes: Array<{ pnl_pct_24h: unknown }>): {
  profitFactor: number;
  expectancy: number;
} {
  const pnls = outcomes.map((o) => Number(o.pnl_pct_24h ?? 0));
  const gains = pnls.filter((v) => v > 0);
  const losses = pnls.filter((v) => v < 0);
  const grossProfit = gains.reduce((s, v) => s + v, 0);
  const grossLoss = Math.abs(losses.reduce((s, v) => s + v, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 10 : 0;
  const expectancy = pnls.length > 0 ? pnls.reduce((s, v) => s + v, 0) / pnls.length : 0;
  return { profitFactor, expectancy };
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}
