import { DexScreenerClient, type DexPair } from "../market/dexscreener";

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
 * Escanea DexScreener buscando tokens con tracción real:
 *  - Volumen creciente en múltiples timeframes
 *  - Más compras que ventas
 *  - Liquidez estable o creciente
 *  - Precio subiendo pero no parabólico
 *  - Par con antigüedad suficiente (no scams de 1 día)
 *
 * Genera un momentumScore 0-100.
 * Coste: $0 (DexScreener API gratuita).
 */
export class MomentumDetector {
  private dex: DexScreenerClient;
  private config: MomentumConfig;

  constructor(config?: Partial<MomentumConfig>) {
    this.dex = new DexScreenerClient();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Escanea tokens trending en DexScreener y filtra por momentum.
   */
  async scan(): Promise<MomentumSignal[]> {
    const signals: MomentumSignal[] = [];

    const trending = await this.dex.search("trending");

    for (const pair of trending) {
      const signal = this.analyzePair(pair);
      if (signal) signals.push(signal);
    }

    signals.sort((a, b) => b.momentumScore - a.momentumScore);

    return signals;
  }

  /**
   * Analiza un token específico por address + network.
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
   * Analiza una lista de tokens.
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
    const buyPressure = txns24h.sells > 0 ? txns24h.buys / txns24h.sells : txns24h.buys > 0 ? 5 : 0;

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
    // Buy pressure (0-25)
    const bpScore = Math.min(buyPressure * 8, 25);

    // Volume acceleration (0-20)
    const vaScore = Math.min(volumeAccel * 8, 20);

    // Price momentum: queremos subida gradual (2-30%), no parabólica
    const pc1h = pair.priceChange?.h1 ?? 0;
    const pc6h = pair.priceChange?.h6 ?? 0;
    let priceScore = 0;
    if (pc1h > 0 && pc1h < 15 && pc6h > 0 && pc6h < 40) {
      priceScore = Math.min((pc1h + pc6h / 3) * 1.5, 20);
    } else if (pc1h > 0) {
      priceScore = 5;
    }

    // Liquidez vs volumen (>1 = sano, <0.5 = volumen artificial)
    const liqVolRatio = (pair.liquidity?.usd ?? 0) / Math.max(pair.volume?.h24 ?? 1, 1);
    const liqScore = liqVolRatio >= 2 ? 15 : liqVolRatio >= 0.5 ? 10 : liqVolRatio >= 0.2 ? 5 : 0;

    // TX count (actividad orgánica)
    const txs = (pair.txns?.h24?.buys ?? 0) + (pair.txns?.h24?.sells ?? 0);
    const txScore = txs >= 500 ? 10 : txs >= 100 ? 7 : txs >= 30 ? 4 : 1;

    // Madurez del par
    const maturityScore = pairAgeDays >= 30 ? 10 : pairAgeDays >= 7 ? 7 : pairAgeDays >= 2 ? 4 : 0;

    return Math.round(
      bpScore + vaScore + priceScore + liqScore + txScore + maturityScore
    );
  }

  getConfig(): Readonly<MomentumConfig> {
    return this.config;
  }
}
