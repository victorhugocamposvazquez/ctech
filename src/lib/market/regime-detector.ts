import type { SupabaseClient } from "@supabase/supabase-js";
import type { MarketRegime } from "../engine/types";

/**
 * RegimeDetector — determina si el mercado está en risk_on, risk_off o neutral.
 *
 * Fuentes gratuitas:
 *  - Fear & Greed Index (alternative.me, sin API key)
 *  - BTC dominance y volumen total (CoinGecko public, sin API key)
 *
 * No usa Glassnode (de pago). Se puede añadir después como capa extra.
 */

const FEAR_GREED_URL = "https://api.alternative.me/fng/?limit=1";
const COINGECKO_GLOBAL_URL = "https://api.coingecko.com/api/v3/global";

export interface RegimeSnapshot {
  regime: MarketRegime;
  fearGreedValue: number;
  fearGreedClassification: string;
  btcDominance: number;
  totalMarketVolume: number;
  sentimentScore: number;
  confidence: number;
}

export class RegimeDetector {
  constructor(private supabase: SupabaseClient) {}

  async detect(userId: string): Promise<RegimeSnapshot> {
    const [fng, global] = await Promise.all([
      this.fetchFearGreed(),
      this.fetchCoinGeckoGlobal(),
    ]);

    const sentimentScore = this.calcSentiment(fng.value, global.btcDominance);
    const regime = this.classifyRegime(sentimentScore, fng.value);
    const confidence = this.calcConfidence(fng.value);

    const snapshot: RegimeSnapshot = {
      regime,
      fearGreedValue: fng.value,
      fearGreedClassification: fng.classification,
      btcDominance: global.btcDominance,
      totalMarketVolume: global.totalVolume,
      sentimentScore,
      confidence,
    };

    await this.persist(userId, snapshot);

    return snapshot;
  }

  private classifyRegime(
    sentimentScore: number,
    fearGreed: number
  ): MarketRegime {
    if (fearGreed <= 25 || sentimentScore <= 30) return "risk_off";
    if (fearGreed >= 60 && sentimentScore >= 60) return "risk_on";
    return "neutral";
  }

  /**
   * Combina Fear & Greed (0-100) con BTC dominance para generar
   * un score de sentimiento unificado.
   *
   * BTC dominance alta (>60%) en contexto de miedo → risk_off más fuerte.
   * BTC dominance baja (<45%) en contexto de greed → altseason / risk_on.
   */
  private calcSentiment(fearGreed: number, btcDominance: number): number {
    let score = fearGreed;

    if (btcDominance > 60) {
      score -= (btcDominance - 60) * 0.5;
    } else if (btcDominance < 45) {
      score += (45 - btcDominance) * 0.3;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calcConfidence(fearGreed: number): number {
    if (fearGreed <= 15 || fearGreed >= 85) return 90;
    if (fearGreed <= 25 || fearGreed >= 75) return 75;
    if (fearGreed <= 35 || fearGreed >= 65) return 55;
    return 40;
  }

  private async fetchFearGreed(): Promise<{
    value: number;
    classification: string;
  }> {
    try {
      const res = await fetch(FEAR_GREED_URL);
      const data = await res.json();
      const entry = data?.data?.[0];
      return {
        value: parseInt(entry?.value ?? "50", 10),
        classification: entry?.value_classification ?? "Neutral",
      };
    } catch {
      return { value: 50, classification: "Neutral" };
    }
  }

  private async fetchCoinGeckoGlobal(): Promise<{
    btcDominance: number;
    totalVolume: number;
  }> {
    try {
      const res = await fetch(COINGECKO_GLOBAL_URL);
      const data = await res.json();
      const gd = data?.data;
      return {
        btcDominance: gd?.market_cap_percentage?.btc ?? 50,
        totalVolume: gd?.total_volume?.usd ?? 0,
      };
    } catch {
      return { btcDominance: 50, totalVolume: 0 };
    }
  }

  private async persist(
    userId: string,
    snapshot: RegimeSnapshot
  ): Promise<void> {
    await this.supabase.from("market_regimes").insert({
      user_id: userId,
      regime: snapshot.regime,
      btc_dominance: snapshot.btcDominance,
      total_market_vol: snapshot.totalMarketVolume,
      sentiment_score: snapshot.sentimentScore,
      metadata: {
        fear_greed_value: snapshot.fearGreedValue,
        fear_greed_classification: snapshot.fearGreedClassification,
        confidence: snapshot.confidence,
      },
    });
  }
}
