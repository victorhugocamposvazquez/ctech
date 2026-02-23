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
import { AdaptiveRiskGate } from "../engine/adaptive-risk-gate";
import { PaperBroker } from "../engine/paper-broker";
import { RollingPerformanceEngine } from "../engine/rolling-performance";
import type { RollingMetrics } from "../engine/rolling-performance";
import type { RiskState, TradeRecord } from "../engine/types";
import { ArkhamClient } from "../arkham/client";
import { SignalOutcomeTracker } from "./signal-outcome-tracker";
import { IncrementalCalibrator } from "./incremental-calibrator";
import type { DetectorInteraction } from "./incremental-calibrator";
import { SmartMoneySimulator } from "./smart-money-simulator";
import { ForwardPredictor } from "../engine/forward-predictor";
import type { ForwardPrediction } from "../engine/forward-predictor";
import type { StressEvent } from "../engine/stress-events";

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
  rollingMetrics?: RollingMetrics;
  calibration?: {
    momentumThreshold: number;
    earlyThreshold: number;
    coreMinConf: number;
    satMinConf: number;
    exposureMomentumPct?: number;
    exposureEarlyPct?: number;
    detectorBias?: string;
  };
  forwardPrediction7d?: ForwardPrediction;
  forwardPrediction30d?: ForwardPrediction;
  stressEvents: StressEvent[];
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
 *  0. Cargar rolling metrics + calibrar umbrales (auto-tune)
 *  1. Detectar régimen de mercado
 *  2. Simular smart money para tokens trending
 *  3. Escanear tokens con momentum + early
 *  4. Evaluar salud de cada token candidato
 *  5. Pasar por ConfluenceEngine (momentum + wallets + health + régimen)
 *  6. AdaptiveRiskGate evalúa si se puede operar (con sizing dinámico)
 *  7. PaperBroker ejecuta con SlippageModel + MicroVolatility + CompetitionSim
 *  8. PositionManager revisa posiciones abiertas y cierra las que toque
 *  9. Actualizar outcomes + recalibrar
 */
export class Orchestrator {
  private momentum: MomentumDetector;
  private early: EarlyDetector;
  private confluence: ConfluenceEngine;
  private positions: PositionManager;
  private tokenHealth: TokenHealthChecker;
  private regime: RegimeDetector;
  private riskGate: AdaptiveRiskGate;
  private broker: PaperBroker;
  private outcomeTracker: SignalOutcomeTracker;
  private rollingEngine: RollingPerformanceEngine;
  private calibrator: IncrementalCalibrator;
  private smartMoney: SmartMoneySimulator;
  private _pendingStressEvents: StressEvent[] = [];

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
    this.riskGate = new AdaptiveRiskGate();
    this.broker = new PaperBroker(
      this.riskGate,
      new DexScreenerQuoteFetcher()
    );
    this.outcomeTracker = new SignalOutcomeTracker(supabase);
    this.rollingEngine = new RollingPerformanceEngine(supabase);
    this.calibrator = new IncrementalCalibrator(supabase);
    this.smartMoney = new SmartMoneySimulator();
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
      stressEvents: [],
    };

    // --- 0. Rolling metrics + adaptive risk + calibration ---
    try {
      const rolling30d = await this.rollingEngine.compute(this.userId, "30d");
      this.riskGate.setRollingMetrics(rolling30d);
      result.rollingMetrics = rolling30d;
    } catch (err) {
      result.errors.push(`Rolling metrics: ${errMsg(err)}`);
    }

    try {
      const cal = await this.calibrator.recalibrate(this.userId);
      if (cal) {
        result.calibration = {
          momentumThreshold: cal.momentumScoreThreshold,
          earlyThreshold: cal.earlyScoreThreshold,
          coreMinConf: cal.coreMinConfidence,
          satMinConf: cal.satelliteMinConfidence,
          exposureMomentumPct: cal.exposureMomentumPct,
          exposureEarlyPct: cal.exposureEarlyPct,
          detectorBias: cal.detectorInteraction.recommendedBias,
        };

        this.confluence = new ConfluenceEngine(this.supabase, this.userId, {
          minMomentumScore: cal.momentumScoreThreshold,
          minEarlyScore: cal.earlyScoreThreshold,
          coreMinConfidence: cal.coreMinConfidence,
          satelliteMinConfidence: cal.satelliteMinConfidence,
        });
      }
    } catch (err) {
      result.errors.push(`Calibración: ${errMsg(err)}`);
    }

    // --- 0b. Forward prediction (Monte Carlo) ---
    if (result.rollingMetrics) {
      try {
        const riskState = await this.getRiskState();
        result.forwardPrediction7d = ForwardPredictor.predict(
          result.rollingMetrics, "7d", riskState.capital
        );
        result.forwardPrediction30d = ForwardPredictor.predict(
          result.rollingMetrics, "30d", riskState.capital
        );
      } catch (err) {
        result.errors.push(`Forward prediction: ${errMsg(err)}`);
      }
    }

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

        await this.injectSmartMoney(signal.tokenAddress, signal.tokenSymbol, signal.network, signal.momentumScore, false);

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

        await this.injectSmartMoney(signal.tokenAddress, signal.tokenSymbol, signal.network, signal.earlyScore, true);

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

    result.stressEvents = [...this._pendingStressEvents];
    this._pendingStressEvents = [];

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

  private async injectSmartMoney(
    tokenAddress: string,
    tokenSymbol: string,
    network: string,
    score: number,
    isEarly: boolean
  ): Promise<void> {
    try {
      const movements = this.smartMoney.simulateActivity(
        tokenAddress, tokenSymbol, network, score, isEarly
      );
      if (movements.length > 0) {
        await this.smartMoney.persistMovements(this.supabase, this.userId, movements);
      }
    } catch {
      // Non-critical, don't block cycle
    }
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
      priceChange1h: conf.sources.momentum?.priceChange1h ?? conf.sources.early?.priceChange1h ?? 0,
      entryVolume24h: conf.sources.momentum?.volume24h ?? conf.sources.early?.volume24h ?? 0,
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

    if (this.broker.lastStressEvent?.type !== "none" && this.broker.lastStressEvent) {
      this._pendingStressEvents.push(this.broker.lastStressEvent);
    }

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
