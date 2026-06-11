import type { SupabaseClient } from "@supabase/supabase-js";
import { PositionManager } from "../signals/position-manager";
import type { ExitSignal } from "../signals/position-manager";
import { AdaptiveRiskGate } from "./adaptive-risk-gate";
import type { RiskState } from "./types";

export interface GuardianResult {
  userId: string;
  positionsChecked: number;
  exits: ExitSignal[];
  errors: string[];
}

/**
 * PositionGuardian — vigilancia de posiciones abiertas de alta frecuencia.
 *
 * El ciclo completo (detección + entradas) corre cada 15 min, pero los
 * stops/TPs no pueden esperar 15 min en tokens que se mueven ±50% en
 * minutos. Este módulo ejecuta SOLO la gestión de salidas (PositionManager
 * + actualización de risk_state) y está pensado para invocarse cada minuto
 * vía pg_cron → /api/cron/positions.
 *
 * Reutiliza exactamente la misma lógica de salida y de capital que el
 * Orchestrator (PositionManager y AdaptiveRiskGate.applyTradeResult), por
 * lo que da igual quién cierre una posición: el resultado es idéntico.
 */
export async function manageOpenPositions(
  supabase: SupabaseClient,
  userId: string
): Promise<GuardianResult> {
  const result: GuardianResult = {
    userId,
    positionsChecked: 0,
    exits: [],
    errors: [],
  };

  const { count } = await supabase
    .from("trades")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "open")
    .eq("execution_mode", "paper");

  result.positionsChecked = count ?? 0;
  if (!result.positionsChecked) return result;

  const riskState = await loadRiskState(supabase, userId);
  const positions = new PositionManager(supabase);
  const riskGate = new AdaptiveRiskGate();

  try {
    const exits = await positions.checkPositions(userId);
    result.exits = exits;

    for (const exit of exits) {
      try {
        await applyExitToRiskState(supabase, userId, riskGate, riskState, exit);
      } catch (err) {
        result.errors.push(
          `Risk update ${exit.tradeId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  } catch (err) {
    result.errors.push(
      `checkPositions: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return result;
}

async function loadRiskState(
  supabase: SupabaseClient,
  userId: string
): Promise<RiskState> {
  const { data } = await supabase
    .from("risk_state")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (data) {
    return {
      capital: Number(data.capital),
      pnlToday: Number(data.pnl_today),
      pnlThisWeek: Number(data.pnl_this_week),
      tradesTodayCore: data.trades_today_core,
      tradesTodaySatellite: data.trades_today_satellite,
      consecutiveLossesSatellite: data.consecutive_losses_satellite,
      isPaused: data.is_paused,
      pauseReason: data.pause_reason,
      pauseUntil: data.pause_until ? new Date(data.pause_until) : null,
    };
  }

  return {
    capital: 10_000,
    pnlToday: 0,
    pnlThisWeek: 0,
    tradesTodayCore: 0,
    tradesTodaySatellite: 0,
    consecutiveLossesSatellite: 0,
    isPaused: false,
    pauseReason: null,
    pauseUntil: null,
  };
}

async function applyExitToRiskState(
  supabase: SupabaseClient,
  userId: string,
  riskGate: AdaptiveRiskGate,
  riskState: RiskState,
  exit: ExitSignal
): Promise<void> {
  const { data: trade } = await supabase
    .from("trades")
    .select("layer")
    .eq("id", exit.tradeId)
    .single();

  if (!trade) return;

  const layer = trade.layer as "core" | "satellite";
  const { newState } = riskGate.applyTradeResult(riskState, layer, exit.pnlAbs);

  await supabase
    .from("risk_state")
    .update({
      capital: newState.capital,
      pnl_today: newState.pnlToday,
      pnl_this_week: newState.pnlThisWeek,
      trades_today_core: newState.tradesTodayCore,
      trades_today_satellite: newState.tradesTodaySatellite,
      consecutive_losses_satellite: newState.consecutiveLossesSatellite,
      is_paused: newState.isPaused,
      pause_reason: newState.pauseReason,
      pause_until: newState.pauseUntil?.toISOString() ?? null,
    })
    .eq("user_id", userId);

  Object.assign(riskState, newState);
}
