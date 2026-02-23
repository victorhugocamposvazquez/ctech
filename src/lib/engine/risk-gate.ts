import type { Layer, RiskConfig, RiskState, RiskVerdict } from "./types";
import { DEFAULT_RISK_CONFIG } from "./types";

/**
 * RiskGate — portero de cada operación.
 *
 * Antes de que cualquier orden llegue al broker (paper o live),
 * pasa por aquí. Si no supera los filtros, la orden se rechaza.
 *
 * Reglas:
 *  - Pérdida diaria > maxDailyLossPct   → pausa total
 *  - Pérdida semanal > maxWeeklyLossPct  → pausa total
 *  - Trades/día por capa superados       → rechaza capa
 *  - 3 pérdidas seguidas satellite       → pausa satellite 24h
 *  - Sistema pausado manualmente         → rechaza todo
 */
export class RiskGate {
  private config: RiskConfig;

  constructor(config?: Partial<RiskConfig>) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  evaluate(state: RiskState, layer: Layer): RiskVerdict {
    const deny = (reason: string): RiskVerdict => ({
      allowed: false,
      reason,
      maxPositionUsd: 0,
    });

    if (state.isPaused) {
      if (state.pauseUntil && new Date() < state.pauseUntil) {
        return deny(`Sistema pausado hasta ${state.pauseUntil.toISOString()} — ${state.pauseReason ?? "sin motivo"}`);
      }
      // pausa expirada → se permiten trades, el caller debe limpiar el flag
    }

    const dailyLossPct =
      state.capital > 0 ? Math.abs(Math.min(state.pnlToday, 0)) / state.capital : 0;

    if (dailyLossPct >= this.config.maxDailyLossPct) {
      return deny(
        `Pérdida diaria (${(dailyLossPct * 100).toFixed(2)}%) >= límite (${(this.config.maxDailyLossPct * 100).toFixed(1)}%)`
      );
    }

    const weeklyLossPct =
      state.capital > 0 ? Math.abs(Math.min(state.pnlThisWeek, 0)) / state.capital : 0;

    if (weeklyLossPct >= this.config.maxWeeklyLossPct) {
      return deny(
        `Pérdida semanal (${(weeklyLossPct * 100).toFixed(2)}%) >= límite (${(this.config.maxWeeklyLossPct * 100).toFixed(1)}%)`
      );
    }

    const layerConfig = this.config[layer];

    if (layer === "core" && state.tradesTodayCore >= layerConfig.maxTradesPerDay) {
      return deny(
        `Core: ${state.tradesTodayCore} trades hoy, máximo ${layerConfig.maxTradesPerDay}`
      );
    }

    if (layer === "satellite") {
      if (state.tradesTodaySatellite >= layerConfig.maxTradesPerDay) {
        return deny(
          `Satellite: ${state.tradesTodaySatellite} trades hoy, máximo ${layerConfig.maxTradesPerDay}`
        );
      }

      if (
        state.consecutiveLossesSatellite >= this.config.satelliteConsecLossLimit
      ) {
        return deny(
          `Satellite: ${state.consecutiveLossesSatellite} pérdidas seguidas, límite ${this.config.satelliteConsecLossLimit} — cooldown activo`
        );
      }
    }

    const maxPositionUsd = state.capital * layerConfig.maxRiskPerTradePct;

    return { allowed: true, reason: null, maxPositionUsd };
  }

  /**
   * Calcula el nuevo estado de riesgo tras un trade cerrado.
   * El caller persiste el resultado en Supabase.
   */
  applyTradeResult(
    state: RiskState,
    layer: Layer,
    pnl: number
  ): { newState: RiskState; shouldPause: boolean; pauseReason: string | null } {
    const next: RiskState = { ...state };
    next.pnlToday += pnl;
    next.pnlThisWeek += pnl;

    if (layer === "core") {
      next.tradesTodayCore += 1;
    } else {
      next.tradesTodaySatellite += 1;
      if (pnl < 0) {
        next.consecutiveLossesSatellite += 1;
      } else {
        next.consecutiveLossesSatellite = 0;
      }
    }

    let shouldPause = false;
    let pauseReason: string | null = null;

    const dailyLossPct =
      next.capital > 0
        ? Math.abs(Math.min(next.pnlToday, 0)) / next.capital
        : 0;

    if (dailyLossPct >= this.config.maxDailyLossPct) {
      shouldPause = true;
      pauseReason = `Pérdida diaria (${(dailyLossPct * 100).toFixed(2)}%) alcanzó límite`;
    }

    const weeklyLossPct =
      next.capital > 0
        ? Math.abs(Math.min(next.pnlThisWeek, 0)) / next.capital
        : 0;

    if (weeklyLossPct >= this.config.maxWeeklyLossPct) {
      shouldPause = true;
      pauseReason = `Pérdida semanal (${(weeklyLossPct * 100).toFixed(2)}%) alcanzó límite`;
    }

    if (
      layer === "satellite" &&
      next.consecutiveLossesSatellite >= this.config.satelliteConsecLossLimit
    ) {
      shouldPause = true;
      pauseReason = `Satellite: ${next.consecutiveLossesSatellite} pérdidas consecutivas`;
      next.pauseUntil = new Date(Date.now() + this.config.satelliteCooldownMs);
    }

    if (shouldPause) {
      next.isPaused = true;
      next.pauseReason = pauseReason;
      if (!next.pauseUntil) {
        next.pauseUntil = endOfDay();
      }
    }

    return { newState: next, shouldPause, pauseReason };
  }

  getConfig(): Readonly<RiskConfig> {
    return this.config;
  }
}

function endOfDay(): Date {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
