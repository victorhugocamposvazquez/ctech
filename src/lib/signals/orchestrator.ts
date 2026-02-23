import type { SupabaseClient } from "@supabase/supabase-js";
import { MomentumDetector } from "./momentum-detector";
import { EarlyDetector } from "./early-detector";
import { ConfluenceEngine } from "./confluence-engine";
import type { ConfluenceResult } from "./confluence-engine";
import { PositionManager } from "./position-manager";
import type { ExitSignal } from "./position-manager";
import { TokenHealthChecker } from "../market/token-health";
import { RegimeDetector } from "../market/regime-detector";
import { DexScreenerQuoteFetcher } from "../market/quote-fetcher";
import { RiskGate } from "../engine/risk-gate";
import { PaperBroker } from "../engine/paper-broker";
import type { RiskState, TradeRecord } from "../engine/types";
import { ArkhamClient } from "../arkham/client";
import { SignalOutcomeTracker } from "./signal-outcome-tracker";

export interface CycleResult {
  timestamp: Date;
  regime: string;
  poolsScanned: number;
  tokensScanned: number;
  earlyPoolsScanned: number;
  earlyCandidates: number;
  signalsGenerated: number;
  tradesOpened: number;
  tradesClosed: number;
  entries: EntryResult[];
  exits: ExitSignal[];
  errors: string[];
}

interface EntryResult {
  symbol: string;
  layer: string;
  confidence: number;
  signalSource: string;
  executed: boolean;
  reason: string;
}

interface PositionSizingDecision {
  amountUsd: number;
  confidenceFactor: number;
  liquidityFactor: number;
  liquidityCapUsd: number;
  maxByRiskGateUsd: number;
}

/**
 * Orchestrator — pipeline completo end-to-end.
 *
 * Un ciclo:
 *  1. Detectar régimen de mercado
 *  2. Escanear tokens con momentum
 *  3. Evaluar salud de cada token candidato
 *  4. Pasar por ConfluenceEngine (momentum + wallets + health + régimen)
 *  5. RiskGate evalúa si se puede operar
 *  6. PaperBroker ejecuta con datos reales
 *  7. PositionManager revisa posiciones abiertas y cierra las que toque
 *
 * Se llama periódicamente (cron, botón manual, etc.).
 */
export class Orchestrator {
  private momentum: MomentumDetector;
  private early: EarlyDetector;
  private confluence: ConfluenceEngine;
  private positions: PositionManager;
  private tokenHealth: TokenHealthChecker;
  private regime: RegimeDetector;
  private riskGate: RiskGate;
  private broker: PaperBroker;
  private outcomeTracker: SignalOutcomeTracker;

  constructor(
    private supabase: SupabaseClient,
    private userId: string
  ) {
    let arkham: ArkhamClient | undefined;
    try {
      arkham = new ArkhamClient();
    } catch {
      // Arkham no configurado — funciona sin él
    }

    this.momentum = new MomentumDetector();
    this.early = new EarlyDetector();
    this.confluence = new ConfluenceEngine(supabase, userId);
    this.positions = new PositionManager(supabase);
    this.tokenHealth = new TokenHealthChecker(supabase, arkham);
    this.regime = new RegimeDetector(supabase);
    this.riskGate = new RiskGate();
    this.broker = new PaperBroker(
      this.riskGate,
      new DexScreenerQuoteFetcher()
    );
    this.outcomeTracker = new SignalOutcomeTracker(supabase);
  }

  async runCycle(): Promise<CycleResult> {
    const result: CycleResult = {
      timestamp: new Date(),
      regime: "unknown",
      poolsScanned: 0,
      tokensScanned: 0,
      earlyPoolsScanned: 0,
      earlyCandidates: 0,
      signalsGenerated: 0,
      tradesOpened: 0,
      tradesClosed: 0,
      entries: [],
      exits: [],
      errors: [],
    };

    // --- 1. Régimen de mercado ---
    let regimeSnapshot;
    try {
      regimeSnapshot = await this.regime.detect(this.userId);
      result.regime = regimeSnapshot.regime;
    } catch (err) {
      result.errors.push(`Régimen: ${errMsg(err)}`);
    }

    const riskState = await this.getRiskState();
    const processedTokens = new Set<string>();

    // --- 2. Pipeline TRENDING (MomentumDetector → Core/Satellite) ---
    let momentumSignals: Awaited<ReturnType<MomentumDetector["scan"]>>["signals"] = [];
    try {
      const scanResult = await this.momentum.scan();
      momentumSignals = scanResult.signals;
      result.poolsScanned = scanResult.poolsScanned;
      result.tokensScanned = scanResult.signals.length;
      for (const ne of scanResult.networkErrors) {
        result.errors.push(`GeckoTerminal trending: ${ne}`);
      }
    } catch (err) {
      result.errors.push(`Momentum scan: ${errMsg(err)}`);
    }

    for (const signal of momentumSignals) {
      try {
        const key = `${signal.network}:${signal.tokenAddress}`;
        processedTokens.add(key);

        let health = null;
        try {
          health = await this.tokenHealth.checkToken(
            signal.tokenAddress, signal.network, this.userId
          );
        } catch { /* sigue sin health */ }

        const conf = await this.confluence.evaluate(
          signal, health, regimeSnapshot ?? null
        );
        if (!conf) continue;

        result.signalsGenerated++;
        const entry = await this.executeEntry(conf, riskState);
        result.entries.push(entry);

        try {
          await this.outcomeTracker.recordSignal(
            this.userId, conf, entry.executed,
            entry.executed ? null : entry.reason, result.regime
          );
        } catch { /* no bloquear */ }

        if (entry.executed) {
          result.tradesOpened++;
          await this.registerOpenedTrade(riskState, conf.layer);
        }
      } catch (err) {
        result.errors.push(`${signal.tokenSymbol}: ${errMsg(err)}`);
      }
    }

    // --- 3. Pipeline EARLY (EarlyDetector → Satellite preferente) ---
    let earlySignals: Awaited<ReturnType<EarlyDetector["scan"]>>["signals"] = [];
    try {
      const earlyScan = await this.early.scan();
      earlySignals = earlyScan.signals;
      result.earlyPoolsScanned = earlyScan.poolsScanned;
      result.earlyCandidates = earlyScan.signals.length;
      for (const ne of earlyScan.networkErrors) {
        result.errors.push(`GeckoTerminal new_pools: ${ne}`);
      }
    } catch (err) {
      result.errors.push(`Early scan: ${errMsg(err)}`);
    }

    for (const signal of earlySignals) {
      try {
        const key = `${signal.network}:${signal.tokenAddress}`;
        if (processedTokens.has(key)) continue;
        processedTokens.add(key);

        let health = null;
        try {
          health = await this.tokenHealth.checkToken(
            signal.tokenAddress, signal.network, this.userId
          );
        } catch { /* sigue sin health */ }

        const conf = await this.confluence.evaluateEarly(
          signal, health, regimeSnapshot ?? null
        );
        if (!conf) continue;

        result.signalsGenerated++;
        const entry = await this.executeEntry(conf, riskState);
        result.entries.push(entry);

        try {
          await this.outcomeTracker.recordSignal(
            this.userId, conf, entry.executed,
            entry.executed ? null : entry.reason, result.regime
          );
        } catch { /* no bloquear */ }

        if (entry.executed) {
          result.tradesOpened++;
          await this.registerOpenedTrade(riskState, conf.layer);
        }
      } catch (err) {
        result.errors.push(`Early ${signal.tokenSymbol}: ${errMsg(err)}`);
      }
    }

    // --- 4. Actualizar outcomes de señales pasadas ---
    try {
      await this.outcomeTracker.updatePendingOutcomes();
    } catch (err) {
      result.errors.push(`Outcome tracking: ${errMsg(err)}`);
    }

    // --- 5. Gestionar posiciones abiertas ---
    try {
      const exits = await this.positions.checkPositions(this.userId);
      result.exits = exits;
      result.tradesClosed = exits.length;

      for (const exit of exits) {
        await this.updateRiskAfterClose(riskState, exit);
      }
    } catch (err) {
      result.errors.push(`Position check: ${errMsg(err)}`);
    }

    return result;
  }

  private async executeEntry(
    conf: ConfluenceResult,
    riskState: RiskState
  ): Promise<EntryResult> {
    const verdict = this.riskGate.evaluate(riskState, conf.layer);

    if (!verdict.allowed) {
      return {
        symbol: conf.token,
        layer: conf.layer,
        confidence: conf.confidence,
        signalSource: conf.signalSource,
        executed: false,
        reason: verdict.reason ?? "Rechazado por RiskGate",
      };
    }

    const sizing = this.calculateAdaptivePositionSize(conf, verdict.maxPositionUsd);
    conf.order.amountUsd = sizing.amountUsd;
    conf.order.metadata = {
      ...conf.order.metadata,
      positionSizing: sizing,
    };

    if (conf.order.amountUsd <= 0) {
      return {
        symbol: conf.token,
        layer: conf.layer,
        confidence: conf.confidence,
        signalSource: conf.signalSource,
        executed: false,
        reason: "Sizing adaptativo devolvió tamaño <= 0",
      };
    }

    const brokerResult = await this.broker.execute(conf.order, riskState);

    if (!brokerResult.executed || !brokerResult.trade) {
      return {
        symbol: conf.token,
        layer: conf.layer,
        confidence: conf.confidence,
        signalSource: conf.signalSource,
        executed: false,
        reason: brokerResult.reason ?? "PaperBroker rechazó",
      };
    }

    await this.persistTrade(brokerResult.trade, conf);

    return {
      symbol: conf.token,
      layer: conf.layer,
      confidence: conf.confidence,
      signalSource: conf.signalSource,
      executed: true,
      reason: `Ejecutado ($${conf.order.amountUsd.toFixed(2)}) — ${conf.reasons.join(" | ")}`,
    };
  }

  private calculateAdaptivePositionSize(
    conf: ConfluenceResult,
    maxByRiskGateUsd: number
  ): PositionSizingDecision {
    const confidence = Math.max(0, Math.min(100, conf.confidence));
    const confidenceFactor = 0.35 + (confidence / 100) * 0.65;

    const liquidityUsd = Math.max(
      conf.sources.momentum?.liquidityUsd ?? conf.sources.early?.liquidityUsd ?? 0, 0
    );
    const targetLiquidityFloor = 250_000;
    const rawLiquidityFactor = liquidityUsd / targetLiquidityFloor;
    const liquidityFactor = Math.max(0.4, Math.min(rawLiquidityFactor, 1));

    const maxPoolImpactPct = conf.layer === "core" ? 0.005 : 0.003;
    const liquidityCapUsd = liquidityUsd > 0
      ? liquidityUsd * maxPoolImpactPct
      : maxByRiskGateUsd * 0.25;

    const rawSize = maxByRiskGateUsd * confidenceFactor * liquidityFactor;
    const sized = Math.min(rawSize, liquidityCapUsd, maxByRiskGateUsd);
    const minTicketUsd = conf.layer === "core" ? 25 : 15;
    const amountUsd = sized >= minTicketUsd ? sized : 0;

    return {
      amountUsd: Number(amountUsd.toFixed(2)),
      confidenceFactor: Number(confidenceFactor.toFixed(4)),
      liquidityFactor: Number(liquidityFactor.toFixed(4)),
      liquidityCapUsd: Number(liquidityCapUsd.toFixed(2)),
      maxByRiskGateUsd: Number(maxByRiskGateUsd.toFixed(2)),
    };
  }

  private async persistTrade(
    trade: TradeRecord,
    conf: ConfluenceResult
  ): Promise<void> {
    await this.supabase.from("trades").insert({
      user_id: trade.userId,
      signal_id: trade.signalId ?? null,
      symbol: trade.symbol,
      side: trade.side,
      status: "open",
      quantity: trade.quantity,
      entry_price: trade.entryPrice,
      execution_mode: trade.executionMode,
      layer: trade.layer,
      slippage_simulated: trade.slippageSimulated,
      gas_simulated: trade.gasSimulated,
      latency_ms: trade.latencyMs,
      entry_reason: trade.entryReason,
      fees_abs: trade.feesAbs,
      token_health_score_at_entry: trade.tokenHealthScoreAtEntry,
      wallet_score_at_entry: trade.walletScoreAtEntry,
      metadata: {
        ...trade.metadata,
        tokenAddress: conf.tokenAddress,
        network: conf.network,
        signalSource: conf.signalSource,
        confidence: conf.confidence,
        entryVolume24h: conf.sources.momentum?.volume24h ?? conf.sources.early?.volume24h,
        entryLiquidity: conf.sources.momentum?.liquidityUsd ?? conf.sources.early?.liquidityUsd,
      },
    });
  }

  private async getRiskState(): Promise<RiskState> {
    const { data } = await this.supabase
      .from("risk_state")
      .select("*")
      .eq("user_id", this.userId)
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

    // Si no existe, crearlo con valores por defecto
    const defaultState: RiskState = {
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

    await this.supabase.from("risk_state").insert({
      user_id: this.userId,
      capital: defaultState.capital,
    });

    return defaultState;
  }

  private async updateRiskAfterClose(
    riskState: RiskState,
    exit: ExitSignal
  ): Promise<void> {
    const { data: trade } = await this.supabase
      .from("trades")
      .select("layer")
      .eq("id", exit.tradeId)
      .single();

    if (!trade) return;

    const layer = trade.layer as "core" | "satellite";
    const { newState } = this.riskGate.applyTradeResult(
      riskState,
      layer,
      exit.pnlAbs
    );

    await this.supabase
      .from("risk_state")
      .update({
        pnl_today: newState.pnlToday,
        pnl_this_week: newState.pnlThisWeek,
        trades_today_core: newState.tradesTodayCore,
        trades_today_satellite: newState.tradesTodaySatellite,
        consecutive_losses_satellite: newState.consecutiveLossesSatellite,
        is_paused: newState.isPaused,
        pause_reason: newState.pauseReason,
        pause_until: newState.pauseUntil?.toISOString() ?? null,
      })
      .eq("user_id", this.userId);

    // Mantener estado en memoria sincronizado para cierres múltiples en el mismo ciclo.
    Object.assign(riskState, newState);
  }

  private async registerOpenedTrade(
    riskState: RiskState,
    layer: "core" | "satellite"
  ): Promise<void> {
    if (layer === "core") {
      riskState.tradesTodayCore += 1;
    } else {
      riskState.tradesTodaySatellite += 1;
    }

    await this.supabase
      .from("risk_state")
      .update({
        trades_today_core: riskState.tradesTodayCore,
        trades_today_satellite: riskState.tradesTodaySatellite,
      })
      .eq("user_id", this.userId);
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
