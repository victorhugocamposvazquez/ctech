import { DexScreenerClient, type DexPair } from "../market/dexscreener";
import {
  GeckoTerminalClient,
  type GeckoTerminalPool,
  type GeckoTerminalToken,
} from "../market/geckoterminal";
import { BirdeyeClient } from "../market/birdeye";

/**
 * Señal de un token en fase temprana con potencial.
 */
export interface EarlySignal {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  network: string;
  price: number;
  liquidityUsd: number;
  volume24h: number;
  volumeChange: number;
  buyPressure: number;
  buyerSellerRatio: number;
  priceChange1h: number;
  priceChange6h: number;
  priceChange24h: number;
  txCount24h: number;
  pairAgeHours: number;
  earlyScore: number;
  tier: "high_potential" | "moderate_potential" | "speculative";
  bestPair: DexPair;
}

export interface EarlyScanResult {
  signals: EarlySignal[];
  poolsScanned: number;
  networkErrors: string[];
  filterStats?: Record<string, number>;
}

export interface EarlyConfig {
  networks: string[];
  minLiquidityUsd: number;
  maxLiquidityUsd: number;
  minVolume24h: number;
  minBuyPressure: number;
  minBuyerSellerRatio: number;
  minEarlyScore: number;
  maxPairAgeHours: number;
  minPairAgeHours: number;
  maxPriceChange24h: number;
  source: "birdeye" | "gecko";
}

const DEFAULT_CONFIG: EarlyConfig = {
  networks: ["solana"],
  minLiquidityUsd: 500,
  maxLiquidityUsd: 2_000_000,
  minVolume24h: 800,
  minBuyPressure: 1.1,
  minBuyerSellerRatio: 1.1,
  minEarlyScore: 42,
  maxPairAgeHours: 72,
  minPairAgeHours: 0.25,
  maxPriceChange24h: 400,
  source: "birdeye",
};

/**
 * EarlyDetector — descubrimiento de tokens en fase temprana.
 *
 * Busca pools recién creados (últimas 72h) con señales de tracción
 * orgánica. Alimenta la capa Satellite del sistema.
 *
 * Filtros anti-scam:
 *  - Edad mínima 1h (evita honeypots instantáneos)
 *  - Ratio compradores/vendedores > 1.2 (compras orgánicas, no bots)
 *  - Liquidez mínima $5K (evita pools ficticios)
 *  - Precio no parabólico (< 200% en 24h)
 *
 * Diferencia con MomentumDetector:
 *  - Busca NEW pools, no trending pools
 *  - Umbrales más bajos (liquidez, volumen)
 *  - Analiza ratio buyers/sellers (no solo buys/sells)
 *  - Premia crecimiento rápido desde base baja
 *
 * Fuente: GeckoTerminal /new_pools (gratuita).
 */
export class EarlyDetector {
  private gecko: GeckoTerminalClient;
  private birdeye: BirdeyeClient | null;
  private dex: DexScreenerClient;
  private config: EarlyConfig;

  constructor(config?: Partial<EarlyConfig>) {
    this.gecko = new GeckoTerminalClient();
    this.birdeye = null;
    try {
      this.birdeye = new BirdeyeClient();
    } catch {
      this.birdeye = null;
    }
    this.dex = new DexScreenerClient();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async scan(): Promise<EarlyScanResult> {
    if (this.config.source === "birdeye") {
      const fromBirdeye = await this.scanFromBirdeye();
      if (fromBirdeye.signals.length > 0 || fromBirdeye.networkErrors.length === 0) {
        return fromBirdeye;
      }
    }

    const { pools, tokens, errors } =
      await this.gecko.getNewPoolsMultiChain(this.config.networks);

    const seen = new Set<string>();
    const signals: EarlySignal[] = [];
    const filterStats: Record<string, number> = {};

    for (const pool of pools) {
      const pair = this.geckoPoolToDexPair(pool, tokens);
      if (!pair) continue;

      const key = `${pair.chainId}:${pair.baseToken.address}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const rejectReason = this.getRejectReason(pair, pool);
      if (rejectReason) {
        filterStats[rejectReason] = (filterStats[rejectReason] ?? 0) + 1;
        continue;
      }

      const signal = this.analyzeEarlyPair(pair, pool);
      if (signal) signals.push(signal);
    }

    signals.sort((a, b) => b.earlyScore - a.earlyScore);

    return { signals, poolsScanned: pools.length, networkErrors: errors, filterStats };
  }

  private async scanFromBirdeye(): Promise<EarlyScanResult> {
    if (!this.birdeye) {
      return {
        signals: [],
        poolsScanned: 0,
        networkErrors: ["Birdeye no configurado (falta BIRDEYE_API_KEY)"],
      };
    }

    try {
      const pairs = await this.birdeye.getNewPairs(60);
      const seen = new Set<string>();
      const signals: EarlySignal[] = [];
      const filterStats: Record<string, number> = {};

      for (const pair of pairs) {
        const key = `${pair.chainId}:${pair.baseToken.address}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const rejectReason = this.getRejectReason(pair, null);
        if (rejectReason) {
          filterStats[rejectReason] = (filterStats[rejectReason] ?? 0) + 1;
          continue;
        }

        const signal = this.analyzeEarlyPair(pair, null);
        if (signal) signals.push(signal);
      }

      signals.sort((a, b) => b.earlyScore - a.earlyScore);
      return { signals, poolsScanned: pairs.length, networkErrors: [], filterStats };
    } catch (err) {
      return {
        signals: [],
        poolsScanned: 0,
        networkErrors: [`Birdeye new_listing: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  }

  async analyzeToken(
    tokenAddress: string,
    network: string
  ): Promise<EarlySignal | null> {
    const pair = await this.dex.getBestPair(network, tokenAddress);
    if (!pair) return null;
    return this.analyzeEarlyPair(pair, null);
  }

  private geckoPoolToDexPair(
    pool: GeckoTerminalPool,
    tokenMap: Map<string, GeckoTerminalToken>
  ): DexPair | null {
    const a = pool.attributes;
    const networkGt = this.gecko.getPoolNetworkId(pool);
    const chainId = this.gecko.resolveNetwork(networkGt);

    const baseRef = pool.relationships.base_token.data.id;
    const baseAddr = baseRef.includes("_")
      ? baseRef.split("_").slice(1).join("_")
      : baseRef;
    const baseMeta = tokenMap.get(baseRef);

    const quoteRef = pool.relationships.quote_token.data.id;
    const quoteAddr = quoteRef.includes("_")
      ? quoteRef.split("_").slice(1).join("_")
      : quoteRef;

    const nameParts = a.name.split(" / ");

    return {
      chainId,
      dexId: pool.relationships.dex?.data?.id ?? "unknown",
      url: `https://www.geckoterminal.com/${networkGt}/pools/${a.address}`,
      pairAddress: a.address,
      baseToken: {
        address: baseAddr,
        name: baseMeta?.attributes.name ?? nameParts[0]?.trim() ?? "Unknown",
        symbol: baseMeta?.attributes.symbol ?? nameParts[0]?.trim() ?? "???",
      },
      quoteToken: {
        address: quoteAddr,
        name: nameParts[1]?.trim() ?? "Unknown",
        symbol: nameParts[1]?.trim() ?? "???",
      },
      priceNative: a.base_token_price_native_currency ?? "0",
      priceUsd: a.base_token_price_usd ?? "0",
      txns: {
        m5:  { buys: a.transactions.m5.buys,  sells: a.transactions.m5.sells },
        h1:  { buys: a.transactions.h1.buys,  sells: a.transactions.h1.sells },
        h6:  { buys: a.transactions.h6.buys,  sells: a.transactions.h6.sells },
        h24: { buys: a.transactions.h24.buys, sells: a.transactions.h24.sells },
      },
      volume: {
        m5:  parseFloat(a.volume_usd.m5)  || 0,
        h1:  parseFloat(a.volume_usd.h1)  || 0,
        h6:  parseFloat(a.volume_usd.h6)  || 0,
        h24: parseFloat(a.volume_usd.h24) || 0,
      },
      priceChange: {
        m5:  parseFloat(a.price_change_percentage.m5)  || 0,
        h1:  parseFloat(a.price_change_percentage.h1)  || 0,
        h6:  parseFloat(a.price_change_percentage.h6)  || 0,
        h24: parseFloat(a.price_change_percentage.h24) || 0,
      },
      liquidity: {
        usd: parseFloat(a.reserve_in_usd ?? "0") || 0,
        base: 0,
        quote: 0,
      },
      fdv: parseFloat(a.fdv_usd ?? "0") || 0,
      marketCap: parseFloat(a.market_cap_usd ?? "0") || 0,
      pairCreatedAt: a.pool_created_at
        ? new Date(a.pool_created_at).getTime()
        : 0,
    };
  }

  private analyzeEarlyPair(
    pair: DexPair,
    pool: GeckoTerminalPool | null
  ): EarlySignal | null {
    const liquidityUsd = pair.liquidity?.usd ?? 0;
    const volume24h = pair.volume?.h24 ?? 0;
    const price = parseFloat(pair.priceUsd) || 0;

    if (liquidityUsd < this.config.minLiquidityUsd) return null;
    if (liquidityUsd > this.config.maxLiquidityUsd) return null;
    if (volume24h < this.config.minVolume24h) return null;
    if (price <= 0) return null;

    const network = pair.chainId?.toLowerCase() ?? "";
    if (this.config.networks.length > 0 && !this.config.networks.includes(network)) {
      return null;
    }

    const pairAgeMs = pair.pairCreatedAt ? Date.now() - pair.pairCreatedAt : 0;
    const pairAgeHours = pairAgeMs / (60 * 60 * 1000);

    if (pairAgeHours > this.config.maxPairAgeHours) return null;
    if (pairAgeHours < this.config.minPairAgeHours) return null;

    const priceChange24h = pair.priceChange?.h24 ?? 0;
    if (Math.abs(priceChange24h) > this.config.maxPriceChange24h) return null;

    const txns24h = pair.txns?.h24 ?? { buys: 0, sells: 0 };
    const txCount24h = txns24h.buys + txns24h.sells;
    const buyPressure =
      txCount24h < 5
        ? 1.2
        : txns24h.sells > 0
          ? txns24h.buys / txns24h.sells
          : txns24h.buys > 0 ? 5 : 0;

    if (buyPressure < this.config.minBuyPressure) return null;

    const buyerSellerRatio = this.calcBuyerSellerRatio(pool);
    if (buyerSellerRatio < this.config.minBuyerSellerRatio) return null;

    const volumeChange = this.calcVolumeGrowth(pair);
    const earlyScore = this.calcEarlyScore(
      pair, pool, buyPressure, buyerSellerRatio, volumeChange, pairAgeHours
    );

    if (earlyScore < this.config.minEarlyScore) return null;

    const tier: EarlySignal["tier"] =
      earlyScore >= 75 ? "high_potential" :
      earlyScore >= 60 ? "moderate_potential" : "speculative";

    return {
      tokenAddress: pair.baseToken.address,
      tokenSymbol: pair.baseToken.symbol,
      tokenName: pair.baseToken.name,
      network,
      price,
      liquidityUsd,
      volume24h,
      volumeChange,
      buyPressure,
      buyerSellerRatio,
      priceChange1h: pair.priceChange?.h1 ?? 0,
      priceChange6h: pair.priceChange?.h6 ?? 0,
      priceChange24h,
      txCount24h,
      pairAgeHours,
      earlyScore,
      tier,
      bestPair: pair,
    };
  }

  /**
   * Ratio de compradores únicos vs vendedores únicos.
   * Disponible en GeckoTerminal pero no en DexScreener.
   * Un ratio alto indica interés orgánico diversificado.
   */
  private calcBuyerSellerRatio(pool: GeckoTerminalPool | null): number {
    // Birdeye discovery path doesn't provide Gecko pool transactions shape.
    // Use a neutral value so early signals are not blocked by missing metadata.
    if (!pool) return 1.2;
    const h24 = pool.attributes.transactions.h24;
    if (h24.sellers <= 0) return h24.buyers > 0 ? 5 : 1;
    return h24.buyers / h24.sellers;
  }

  /**
   * Crecimiento de volumen: compara ventanas cortas vs largas.
   * Para early tokens, crecimiento rápido es una señal fuerte.
   */
  private calcVolumeGrowth(pair: DexPair): number {
    const v1h = pair.volume?.h1 ?? 0;
    const v6h = pair.volume?.h6 ?? 0;
    const v24h = pair.volume?.h24 ?? 0;

    if (v24h <= 0) return 0;
    if (v6h <= 0) return v1h > 0 ? 3 : 0;

    const recentRate = v1h / (v6h / 6);
    return Math.min(recentRate, 10);
  }

  /**
   * Score compuesto 0-100 para tokens tempranos.
   *
   * Ponderación:
   *  - Buy pressure (txns): 20%
   *  - Buyer/seller ratio (unique wallets): 20%
   *  - Volume growth: 20%
   *  - Organic activity patterns: 15%
   *  - Liquidity growth signal: 15%
   *  - Age sweet spot (6h-48h): 10%
   */
  private calcEarlyScore(
    pair: DexPair,
    pool: GeckoTerminalPool | null,
    buyPressure: number,
    buyerSellerRatio: number,
    volumeGrowth: number,
    pairAgeHours: number
  ): number {
    // Buy pressure (0-20)
    const bpScore = Math.min(buyPressure * 6, 20);

    // Buyer/seller ratio — unique wallets buying > selling (0-20)
    const bsScore = Math.min(buyerSellerRatio * 7, 20);

    // Volume growth (0-20)
    const vgScore = Math.min(volumeGrowth * 5, 20);

    // Organic activity: many small transactions (0-15)
    let organicScore = 0;
    if (pool) {
      const h24 = pool.attributes.transactions.h24;
      const totalBuyers = h24.buyers;
      const totalBuys = h24.buys;
      const avgBuysPerBuyer = totalBuyers > 0 ? totalBuys / totalBuyers : 0;
      if (avgBuysPerBuyer >= 1 && avgBuysPerBuyer <= 3 && totalBuyers >= 20) {
        organicScore = 15;
      } else if (totalBuyers >= 10) {
        organicScore = 10;
      } else if (totalBuyers >= 5) {
        organicScore = 5;
      }
    } else {
      const txs = (pair.txns?.h24?.buys ?? 0) + (pair.txns?.h24?.sells ?? 0);
      organicScore = txs >= 50 ? 10 : txs >= 20 ? 6 : 2;
    }

    // Liquidity relative to age (0-15)
    const liqPerHour = pairAgeHours > 0
      ? (pair.liquidity?.usd ?? 0) / pairAgeHours
      : 0;
    let liqGrowthScore = 0;
    if (liqPerHour >= 5000) liqGrowthScore = 15;
    else if (liqPerHour >= 1000) liqGrowthScore = 10;
    else if (liqPerHour >= 200) liqGrowthScore = 5;

    // Age sweet spot (0-10): 6h-48h is ideal
    let ageScore = 0;
    if (pairAgeHours >= 6 && pairAgeHours <= 48) ageScore = 10;
    else if (pairAgeHours >= 2 && pairAgeHours <= 72) ageScore = 6;
    else ageScore = 2;

    return Math.round(
      bpScore + bsScore + vgScore + organicScore + liqGrowthScore + ageScore
    );
  }

  getConfig(): Readonly<EarlyConfig> {
    return this.config;
  }

  private getRejectReason(
    pair: DexPair,
    pool: GeckoTerminalPool | null
  ): string | null {
    const liquidityUsd = pair.liquidity?.usd ?? 0;
    const volume24h = pair.volume?.h24 ?? 0;
    const price = parseFloat(pair.priceUsd) || 0;
    if (liquidityUsd < this.config.minLiquidityUsd) return "low_liquidity";
    if (liquidityUsd > this.config.maxLiquidityUsd) return "high_liquidity";
    if (volume24h < this.config.minVolume24h) return "low_volume";
    if (price <= 0) return "invalid_price";

    const network = pair.chainId?.toLowerCase() ?? "";
    if (this.config.networks.length > 0 && !this.config.networks.includes(network)) {
      return "network_filtered";
    }

    const pairAgeMs = pair.pairCreatedAt ? Date.now() - pair.pairCreatedAt : 0;
    const pairAgeHours = pairAgeMs / (60 * 60 * 1000);
    if (pairAgeHours > this.config.maxPairAgeHours) return "too_old_pair";
    if (pairAgeHours < this.config.minPairAgeHours) return "too_new_pair";

    const priceChange24h = pair.priceChange?.h24 ?? 0;
    if (Math.abs(priceChange24h) > this.config.maxPriceChange24h) return "price_too_volatile";

    const txns24h = pair.txns?.h24 ?? { buys: 0, sells: 0 };
    const txCount24h = txns24h.buys + txns24h.sells;
    const buyPressure =
      txCount24h < 5
        ? 1.2
        : txns24h.sells > 0
          ? txns24h.buys / txns24h.sells
          : txns24h.buys > 0 ? 5 : 0;
    if (buyPressure < this.config.minBuyPressure) return "low_buy_pressure";

    const buyerSellerRatio = this.calcBuyerSellerRatio(pool);
    if (buyerSellerRatio < this.config.minBuyerSellerRatio) return "low_buyer_seller_ratio";

    const volumeChange = this.calcVolumeGrowth(pair);
    const earlyScore = this.calcEarlyScore(
      pair, pool, buyPressure, buyerSellerRatio, volumeChange, pairAgeHours
    );
    if (earlyScore < this.config.minEarlyScore) return "low_early_score";

    return null;
  }
}
