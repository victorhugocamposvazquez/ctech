import type {
  OrderRequest,
  FillResult,
  TradeRecord,
  PriceQuote,
  RiskState,
} from "./types";
import { RiskGate } from "./risk-gate";

/**
 * PaperBroker — ejecuta órdenes contra datos de mercado reales
 * sin tocar contratos ni mover fondos.
 *
 * Flujo:
 *  1. RiskGate.evaluate() → ¿se puede operar?
 *  2. fetchQuote()          → precio/liquidez real del token
 *  3. simulateFill()        → slippage + gas + latencia
 *  4. buildTradeRecord()    → registro listo para Supabase
 */
export class PaperBroker {
  private riskGate: RiskGate;
  private quoteFetcher: QuoteFetcher;

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

    const fill = simulateFill(order.side, positionUsd, quote);

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
      },
    };

    return { executed: true, reason: null, fill, trade };
  }
}

// --------------- Simulación de fill ---------------

function simulateFill(
  side: "buy" | "sell",
  positionUsd: number,
  quote: PriceQuote
): FillResult {
  const slippagePct = estimateSlippage(positionUsd, quote.liquidityUsd);
  const spreadImpact = quote.spreadPct / 2;

  const priceImpact =
    side === "buy" ? 1 + slippagePct + spreadImpact : 1 - slippagePct - spreadImpact;
  const entryPrice = quote.price * priceImpact;
  const quantity = positionUsd / entryPrice;

  const gasCost = estimateGas(quote.network);
  const latencyMs = simulateLatency();

  return {
    success: true,
    entryPrice,
    quantity,
    slippage: slippagePct,
    gasCost,
    latencyMs,
    fillTimestamp: new Date(),
  };
}

/**
 * Slippage proporcional al tamaño vs liquidez del pool.
 * Modelo simplificado: slippage ≈ (positionUsd / liquidityUsd) * factor
 * Con suelo y techo realistas.
 */
function estimateSlippage(positionUsd: number, liquidityUsd: number): number {
  if (liquidityUsd <= 0) return 0.05; // 5% máximo si no hay data

  const ratio = positionUsd / liquidityUsd;
  const base = ratio * 2;
  const noise = (Math.random() - 0.5) * 0.001;

  return Math.max(0.0005, Math.min(base + noise, 0.05));
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
