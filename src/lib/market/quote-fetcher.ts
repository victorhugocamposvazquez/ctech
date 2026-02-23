import { DexScreenerClient } from "./dexscreener";
import type { QuoteFetcher } from "../engine/paper-broker";
import type { PriceQuote } from "../engine/types";

/**
 * DexScreenerQuoteFetcher — implementación de QuoteFetcher
 * que obtiene cotizaciones reales de DexScreener (gratis).
 *
 * Conecta directamente con el PaperBroker para que las
 * simulaciones usen precios y liquidez del mercado real.
 */
export class DexScreenerQuoteFetcher implements QuoteFetcher {
  private dex: DexScreenerClient;

  constructor() {
    this.dex = new DexScreenerClient();
  }

  async getQuote(tokenAddress: string, network: string): Promise<PriceQuote> {
    const pair = await this.dex.getBestPair(network, tokenAddress);

    if (!pair) {
      throw new Error(
        `No se encontró par en DexScreener para ${tokenAddress} en ${network}`
      );
    }

    const price = parseFloat(pair.priceUsd) || 0;
    const liquidityUsd = pair.liquidity?.usd ?? 0;
    const volume24h = pair.volume?.h24 ?? 0;

    const spreadPct =
      liquidityUsd > 0
        ? Math.max(0.05, (1 / Math.sqrt(liquidityUsd / 1000)) * 100 * (volume24h > 0 ? 0.9 : 1.1))
        : 5;

    return {
      symbol: pair.baseToken.symbol,
      tokenAddress,
      network,
      price,
      liquidityUsd,
      spreadPct: Math.min(spreadPct, 10),
      timestamp: new Date(),
    };
  }
}
