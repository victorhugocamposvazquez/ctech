import type {
  OrderRequest,
  FillResult,
  TradeRecord,
  PriceQuote,
  RiskState,
} from "./types";
import { RiskGate } from "./risk-gate";
import { SlippageModel } from "./slippage-model";
import { CompetitionSimulator } from "./competition-simulator";
import { MicroVolatility } from "./micro-volatility";
import { StressEventSimulator } from "./stress-events";
import type { StressEvent } from "./stress-events";

/**
 * PaperBroker — ejecuta órdenes contra datos de mercado reales
 * sin tocar contratos ni mover fondos.
 *
 * Flujo:
 *  1. RiskGate.evaluate() → ¿se puede operar?
 *  2. fetchQuote()          → precio/liquidez real del token
 *  3. StressEvent check     → ¿evento extremo en este ciclo?
 *  4. MicroVolatility       → ruido de precio durante latencia
 *  5. SlippageModel (AMM)   → impacto no-lineal de precio
 *  6. CompetitionSimulator  → MEV / front-run / back-run
 *  7. buildTradeRecord()    → registro listo para Supabase
 */
export class PaperBroker {
  private riskGate: RiskGate;
  private quoteFetcher: QuoteFetcher;
  lastStressEvent: StressEvent | null = null;

  constructor(riskGate: RiskGate, quoteFetcher: QuoteFetcher) {
    this.riskGate = riskGate;
    this.quoteFetcher = quoteFetcher;
  }

  async execute(
    order: OrderRequest,
    riskState: RiskState
  ): Promise<PaperBrokerResult> {
    const verdict = this.riskGate.evaluate(riskState, order.layer);

    if (!verdict.allowed) {
      return {
        executed: false,
        reason: verdict.reason!,
        fill: null,
        trade: null,
      };
    }

    const positionUsd = Math.min(order.amountUsd, verdict.maxPositionUsd);

    if (positionUsd <= 0) {
      return {
        executed: false,
        reason: "Tamaño de posición <= 0 tras ajuste de riesgo",
        fill: null,
        trade: null,
      };
    }

    let quote: PriceQuote;
    try {
      quote = await this.quoteFetcher.getQuote(
        order.tokenAddress,
        order.network
      );
    } catch (err) {
      return {
        executed: false,
        reason: `Error obteniendo precio: ${err instanceof Error ? err.message : String(err)}`,
        fill: null,
        trade: null,
      };
    }

    if (quote.price <= 0) {
      return {
        executed: false,
        reason: `Precio inválido para ${order.symbol}: ${quote.price}`,
        fill: null,
        trade: null,
      };
    }

    const pairAgeHours = (order.metadata?.pairAgeHours as number) ?? 100;
    const stressEvent = StressEventSimulator.rollForEvent(
      quote.liquidityUsd,
      pairAgeHours,
      order.layer
    );
    this.lastStressEvent = stressEvent;

    if (stressEvent.type !== "none") {
      quote = {
        ...quote,
        liquidityUsd: Math.max(
          100,
          quote.liquidityUsd * (1 + stressEvent.liquidityImpactPct)
        ),
        price: Math.max(
          1e-12,
          quote.price * (1 + stressEvent.priceImpactPct)
        ),
      };
    }

    const fill = simulateFill(order, positionUsd, quote);

    const trade: TradeRecord = {
      userId: order.userId,
      signalId: order.signalId,
      symbol: order.symbol,
      side: order.side,
      status: "open",
      quantity: fill.quantity,
      entryPrice: fill.entryPrice,
      feesAbs: fill.gasCost,
      executionMode: order.executionMode,
      layer: order.layer,
      slippageSimulated: fill.slippage,
      gasSimulated: fill.gasCost,
      latencyMs: fill.latencyMs,
      entryReason: order.entryReason,
      walletMovementId: order.walletMovementId,
      tokenHealthScoreAtEntry: order.tokenHealthScoreAtEntry,
      walletScoreAtEntry: order.walletScoreAtEntry,
      metadata: {
        ...order.metadata,
        paperBroker: true,
        quotePrice: quote.price,
        quoteLiquidity: quote.liquidityUsd,
        quoteSpread: quote.spreadPct,
        priceImpactPct: fill.priceImpactPct,
        depthScore: fill.depthScore,
        wasFrontrun: fill.wasFrontrun,
        wasBackrun: fill.wasBackrun,
        competitionSlippage: fill.competitionSlippagePct,
        noisePct: fill.noisePct,
        stressEvent: stressEvent.type !== "none" ? stressEvent : undefined,
      },
    };

    return { executed: true, reason: null, fill, trade };
  }
}

// --------------- Simulación de fill (enhanced) ---------------

function simulateFill(
  order: OrderRequest,
  positionUsd: number,
  quote: PriceQuote
): FillResult {
  const latencyMs = simulateLatency();

  const priceChange1hPct = (order.metadata?.priceChange1h as number) ?? 0;
  const { adjustedPrice: noisePrice, noisePct } = MicroVolatility.apply(
    quote.price,
    latencyMs,
    { priceChange1hPct }
  );

  const slippageEst = SlippageModel.estimate(
    positionUsd,
    quote.liquidityUsd,
    noisePrice,
    order.side,
    { feeRate: 0.003 }
  );

  const volume24h = (order.metadata?.entryVolume24h as number) ?? 0;
  const competition = CompetitionSimulator.simulate(
    order.network,
    positionUsd,
    quote.liquidityUsd,
    volume24h
  );

  const totalSlippage = slippageEst.slippagePct + competition.additionalSlippagePct;
  const spreadImpact = quote.spreadPct / 2;

  const priceImpact =
    order.side === "buy"
      ? 1 + totalSlippage + spreadImpact
      : 1 - totalSlippage - spreadImpact;

  const entryPrice = noisePrice * priceImpact;
  const quantity = positionUsd / entryPrice;

  const gasCost = estimateGas(quote.network);

  return {
    success: true,
    entryPrice,
    quantity,
    slippage: totalSlippage,
    gasCost,
    latencyMs,
    fillTimestamp: new Date(),
    priceImpactPct: slippageEst.priceImpactPct,
    depthScore: slippageEst.depthScore,
    wasFrontrun: competition.wasFrontrun,
    wasBackrun: competition.wasBackrun,
    competitionSlippagePct: competition.additionalSlippagePct,
    noisePct,
  };
}

const GAS_ESTIMATES_USD: Record<string, [number, number]> = {
  ethereum: [3, 25],
  base: [0.01, 0.15],
  arbitrum: [0.05, 0.5],
  optimism: [0.05, 0.5],
  polygon: [0.01, 0.1],
  solana: [0.005, 0.05],
  bsc: [0.1, 0.5],
};

function estimateGas(network: string): number {
  const range = GAS_ESTIMATES_USD[network.toLowerCase()] ?? [0.5, 5];
  return range[0] + Math.random() * (range[1] - range[0]);
}

function simulateLatency(): number {
  return Math.round(100 + Math.random() * 900);
}

// --------------- Interfaces de abstracción ---------------

export interface QuoteFetcher {
  getQuote(tokenAddress: string, network: string): Promise<PriceQuote>;
}

export interface PaperBrokerResult {
  executed: boolean;
  reason: string | null;
  fill: FillResult | null;
  trade: TradeRecord | null;
}
