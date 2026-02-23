// ============================================================
// IncrementalCalibrator — auto-tuning signal thresholds
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
}

const TARGET_HIT_RATE_CORE = 0.55;
const TARGET_HIT_RATE_SAT = 0.40;
const STEP_SIZE = 2;
const MIN_OUTCOMES = 20;

/**
 * IncrementalCalibrator adjusts signal detection thresholds
 * based on recent outcome data from `signal_outcomes`.
 *
 * Logic:
 *  - If hit rate is below target → raise thresholds (more selective)
 *  - If hit rate is above target → lower thresholds (allow more signals)
 *  - Step size is intentionally small (±2 pts) to avoid oscillation
 *  - Calibration requires minimum 20 tracked outcomes to activate
 *
 * The calibrated thresholds are persisted to `calibration_state` and
 * read by the Orchestrator to configure MomentumDetector, EarlyDetector,
 * and ConfluenceEngine on each cycle.
 */
export class IncrementalCalibrator {
  constructor(private supabase: SupabaseClient) {}

  async recalibrate(userId: string): Promise<CalibrationState | null> {
    const { data: outcomes } = await this.supabase
      .from("signal_outcomes")
      .select("layer, pnl_pct_24h, confidence, was_executed")
      .eq("user_id", userId)
      .not("pnl_pct_24h", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!outcomes || outcomes.length < MIN_OUTCOMES) return null;

    const coreOutcomes = outcomes.filter((o) => o.layer === "core");
    const satOutcomes = outcomes.filter((o) => o.layer === "satellite");

    const hitRate_core = calcHitRate(coreOutcomes);
    const hitRate_sat = calcHitRate(satOutcomes);
    const avgPnl24h = calcAvgPnl(outcomes);
    const { profitFactor, expectancy } = calcPfAndExp(outcomes);

    const current = await this.getCurrentState(userId);

    let momThreshold = current?.momentumScoreThreshold ?? 55;
    let earlyThreshold = current?.earlyScoreThreshold ?? 50;
    let coreConf = current?.coreMinConfidence ?? 75;
    let satConf = current?.satelliteMinConfidence ?? 50;

    if (hitRate_core < TARGET_HIT_RATE_CORE && coreOutcomes.length >= 10) {
      momThreshold = Math.min(momThreshold + STEP_SIZE, 80);
      coreConf = Math.min(coreConf + STEP_SIZE, 90);
    } else if (hitRate_core > TARGET_HIT_RATE_CORE + 0.15 && coreOutcomes.length >= 10) {
      momThreshold = Math.max(momThreshold - STEP_SIZE, 40);
      coreConf = Math.max(coreConf - STEP_SIZE, 60);
    }

    if (hitRate_sat < TARGET_HIT_RATE_SAT && satOutcomes.length >= 10) {
      earlyThreshold = Math.min(earlyThreshold + STEP_SIZE, 70);
      satConf = Math.min(satConf + STEP_SIZE, 70);
    } else if (hitRate_sat > TARGET_HIT_RATE_SAT + 0.15 && satOutcomes.length >= 10) {
      earlyThreshold = Math.max(earlyThreshold - STEP_SIZE, 35);
      satConf = Math.max(satConf - STEP_SIZE, 35);
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
        },
        { onConflict: "user_id" }
      );
  }
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
