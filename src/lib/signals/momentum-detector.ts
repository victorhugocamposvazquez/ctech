import { DexScreenerClient, type DexPair } from "../market/dexscreener";
import {
  GeckoTerminalClient,
  type GeckoTerminalPool,
  type GeckoTerminalToken,
} from "../market/geckoterminal";

export interface MomentumSignal {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  network: string;
  price: number;
  liquidityUsd: number;
  volume24h: number;
  volumeChange: number;
  buyPressure: number;
  priceChange1h: number;
  priceChange6h: number;
  priceChange24h: number;
  txCount24h: number;
  pairAge: number;
  momentumScore: number;
  tier: "strong" | "moderate" | "weak";
  bestPair: DexPair;
}

export interface MomentumScanResult {
  signals: MomentumSignal[];
  poolsScanned: number;
  networkErrors: string[];
}

export interface MomentumConfig {
  networks: string[];
  minLiquidityUsd: number;
  maxLiquidityUsd: number;
  minVolume24h: number;
  minBuyPressure: number;
  minMomentumScore: number;
  minPairAgeDays: number;
  maxPriceChange24h: number;
}

const DEFAULT_CONFIG: MomentumConfig = {
  networks: ["ethereum", "base", "solana", "arbitrum"],
  minLiquidityUsd: 50_000,
  maxLiquidityUsd: 50_000_000,
  minVolume24h: 10_000,
  minBuyPressure: 1.2,
  minMomentumScore: 55,
  minPairAgeDays: 2,
  maxPriceChange24h: 80,
};

/**
 * MomentumDetector — señal principal del sistema.
 *
 * Descubre tokens con tracción real usando GeckoTerminal (trending pools)
 * y los analiza para generar un momentumScore 0-100.
 *
 * Criterios:
 *  - Volumen creciente en múltiples timeframes
 *  - Más compras que ventas (buy pressure)
 *  - Liquidez estable en rango adecuado
 *  - Precio subiendo pero no parabólico
 *  - Par con antigüedad suficiente (no scams de 1 día)
 *
 * GeckoTerminal: descubrimiento (trending pools multi-cadena).
 * DexScreener:   datos de ejecución (quotes, pares individuales).
 *
 * Coste: $0 (ambas APIs gratuitas).
 */
export class MomentumDetector {
  private dex: DexScreenerClient;
  private gecko: GeckoTerminalClient;
  private config: MomentumConfig;

  constructor(config?: Partial<MomentumConfig>) {
    this.dex = new DexScreenerClient();
    this.gecko = new GeckoTerminalClient();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Escanea trending pools en GeckoTerminal (multi-cadena) y filtra
   * por momentum. Devuelve señales ordenadas por score descendente
   * junto con el total de pools escaneados.
   */
  async scan(): Promise<MomentumScanResult> {
    const { pools, tokens, errors } =
      await this.gecko.getTrendingPoolsMultiChain(this.config.networks);

    const seen = new Set<string>();
    const signals: MomentumSignal[] = [];

    for (const pool of pools) {
      const pair = this.geckoPoolToDexPair(pool, tokens);
      if (!pair) continue;

      const key = `${pair.chainId}:${pair.baseToken.address}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const signal = this.analyzePair(pair);
      if (signal) signals.push(signal);
    }

    signals.sort((a, b) => b.momentumScore - a.momentumScore);

    return { signals, poolsScanned: pools.length, networkErrors: errors };
  }

  /**
   * Analiza un token específico por address + network (vía DexScreener).
   */
  async analyzeToken(
    tokenAddress: string,
    network: string
  ): Promise<MomentumSignal | null> {
    const pair = await this.dex.getBestPair(network, tokenAddress);
    if (!pair) return null;
    return this.analyzePair(pair);
  }

  /**
   * Analiza una lista de tokens (vía DexScreener).
   */
  async analyzeTokens(
    tokens: { address: string; network: string }[]
  ): Promise<MomentumSignal[]> {
    const signals: MomentumSignal[] = [];
    for (const t of tokens) {
      const s = await this.analyzeToken(t.address, t.network);
      if (s) signals.push(s);
    }
    return signals.sort((a, b) => b.momentumScore - a.momentumScore);
  }

  // ----- Conversion GeckoTerminal → DexPair -----

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

  // ----- Análisis -----

  private analyzePair(pair: DexPair): MomentumSignal | null {
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
    const pairAgeDays = pairAgeMs / (24 * 60 * 60 * 1000);
    if (pairAgeDays < this.config.minPairAgeDays) return null;

    const priceChange24h = pair.priceChange?.h24 ?? 0;
    if (Math.abs(priceChange24h) > this.config.maxPriceChange24h) return null;

    const txns24h = pair.txns?.h24 ?? { buys: 0, sells: 0 };
    const txCount24h = txns24h.buys + txns24h.sells;
    const buyPressure =
      txns24h.sells > 0
        ? txns24h.buys / txns24h.sells
        : txns24h.buys > 0
          ? 5
          : 0;

    if (buyPressure < this.config.minBuyPressure) return null;

    const volumeChange = this.calcVolumeAcceleration(pair);
    const momentumScore = this.calcMomentumScore(pair, buyPressure, volumeChange, pairAgeDays);

    if (momentumScore < this.config.minMomentumScore) return null;

    const tier: MomentumSignal["tier"] =
      momentumScore >= 80 ? "strong" :
      momentumScore >= 65 ? "moderate" : "weak";

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
      priceChange1h: pair.priceChange?.h1 ?? 0,
      priceChange6h: pair.priceChange?.h6 ?? 0,
      priceChange24h,
      txCount24h,
      pairAge: pairAgeDays,
      momentumScore,
      tier,
      bestPair: pair,
    };
  }

  /**
   * Aceleración de volumen: compara volumen en timeframes crecientes.
   * Si vol_1h/vol_6h > vol_6h/vol_24h → acelerando (bueno).
   */
  private calcVolumeAcceleration(pair: DexPair): number {
    const v1h = pair.volume?.h1 ?? 0;
    const v6h = pair.volume?.h6 ?? 0;
    const v24h = pair.volume?.h24 ?? 0;

    if (v24h <= 0) return 0;
    if (v6h <= 0) return v1h > 0 ? 2 : 0;

    const recentRate = v1h / (v6h / 6);
    const olderRate = v6h / (v24h / 24);

    if (olderRate <= 0) return recentRate > 1 ? 2 : 0;

    return recentRate / olderRate;
  }

  /**
   * Score compuesto 0-100.
   *
   * Ponderación:
   *  - Buy pressure: 25%
   *  - Volume acceleration: 20%
   *  - Price momentum (gradual, no parabólico): 20%
   *  - Liquidez relativa al volumen (salud): 15%
   *  - Actividad (tx count): 10%
   *  - Madurez del par: 10%
   */
  private calcMomentumScore(
    pair: DexPair,
    buyPressure: number,
    volumeAccel: number,
    pairAgeDays: number
  ): number {
    const bpScore = Math.min(buyPressure * 8, 25);
    const vaScore = Math.min(volumeAccel * 8, 20);

    const pc1h = pair.priceChange?.h1 ?? 0;
    const pc6h = pair.priceChange?.h6 ?? 0;
    let priceScore = 0;
    if (pc1h > 0 && pc1h < 15 && pc6h > 0 && pc6h < 40) {
      priceScore = Math.min((pc1h + pc6h / 3) * 1.5, 20);
    } else if (pc1h > 0) {
      priceScore = 5;
    }

    const liqVolRatio = (pair.liquidity?.usd ?? 0) / Math.max(pair.volume?.h24 ?? 1, 1);
    const liqScore = liqVolRatio >= 2 ? 15 : liqVolRatio >= 0.5 ? 10 : liqVolRatio >= 0.2 ? 5 : 0;

    const txs = (pair.txns?.h24?.buys ?? 0) + (pair.txns?.h24?.sells ?? 0);
    const txScore = txs >= 500 ? 10 : txs >= 100 ? 7 : txs >= 30 ? 4 : 1;

    const maturityScore = pairAgeDays >= 30 ? 10 : pairAgeDays >= 7 ? 7 : pairAgeDays >= 2 ? 4 : 0;

    return Math.round(
      bpScore + vaScore + priceScore + liqScore + txScore + maturityScore
    );
  }

  getConfig(): Readonly<MomentumConfig> {
    return this.config;
  }
}
