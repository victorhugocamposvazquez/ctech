import type { SupabaseClient } from "@supabase/supabase-js";
import { DexScreenerClient, type DexPair } from "./dexscreener";
import { ArkhamClient } from "../arkham/client";

const MIN_LIQUIDITY_USD = 50_000;
const MIN_VOLUME_24H_USD = 10_000;
const MAX_SPREAD_PCT = 3;
const MAX_TOP10_CONCENTRATION = 0.85;

export interface TokenHealthResult {
  tokenId: string;
  tokenAddress: string;
  network: string;
  symbol: string;
  liquidityUsd: number;
  volume24hUsd: number;
  spreadPct: number;
  holdersCount: number | null;
  top10ConcentrationPct: number | null;
  contractRiskFlags: string[];
  healthScore: number;
  bestPair: DexPair | null;
}

/**
 * TokenHealthChecker — evalúa la salud de un token antes de operar.
 *
 * Fuentes:
 *  - DexScreener (gratis): precio, liquidez, volumen, spread.
 *  - Arkham holders (30 créditos): concentración de holders.
 *
 * Genera un health_score 0-100 y lo persiste como token_health_snapshot.
 */
export class TokenHealthChecker {
  private dex: DexScreenerClient;
  private arkham: ArkhamClient | null;

  constructor(
    private supabase: SupabaseClient,
    arkham?: ArkhamClient
  ) {
    this.dex = new DexScreenerClient();
    this.arkham = arkham ?? null;
  }

  async checkToken(
    tokenAddress: string,
    network: string,
    userId: string
  ): Promise<TokenHealthResult | null> {
    const bestPair = await this.dex.getBestPair(network, tokenAddress);
    if (!bestPair) return null;

    const liquidityUsd = bestPair.liquidity?.usd ?? 0;
    const volume24hUsd = bestPair.volume?.h24 ?? 0;
    const priceUsd = parseFloat(bestPair.priceUsd) || 0;

    const spreadPct = this.estimateSpread(liquidityUsd, volume24hUsd);

    let holdersCount: number | null = null;
    let top10ConcentrationPct: number | null = null;

    if (this.arkham) {
      try {
        const holders = await this.arkham.getTokenHolders(network, tokenAddress);
        holdersCount = holders.holders?.length ?? null;
        if (holders.holders?.length) {
          const totalShare = holders.holders
            .slice(0, 10)
            .reduce((s, h) => s + (h.share ?? 0), 0);
          top10ConcentrationPct = totalShare;
        }
      } catch {
        // Arkham holders falla silenciosamente (30 créditos, opcional)
      }
    }

    const contractRiskFlags = this.detectRiskFlags(bestPair, liquidityUsd, priceUsd);

    const healthScore = this.calcHealthScore({
      liquidityUsd,
      volume24hUsd,
      spreadPct,
      top10ConcentrationPct,
      contractRiskFlags,
      pairAge: bestPair.pairCreatedAt,
    });

    const result: TokenHealthResult = {
      tokenId: "",
      tokenAddress,
      network,
      symbol: bestPair.baseToken.symbol,
      liquidityUsd,
      volume24hUsd,
      spreadPct,
      holdersCount,
      top10ConcentrationPct,
      contractRiskFlags,
      healthScore,
      bestPair,
    };

    await this.persistSnapshot(result, userId);

    return result;
  }

  async checkMultipleTokens(
    tokens: { address: string; network: string }[],
    userId: string
  ): Promise<TokenHealthResult[]> {
    const results: TokenHealthResult[] = [];
    for (const t of tokens) {
      const r = await this.checkToken(t.address, t.network, userId);
      if (r) results.push(r);
    }
    return results;
  }

  private estimateSpread(liquidityUsd: number, volume24h: number): number {
    if (liquidityUsd <= 0) return 5;
    const base = 1 / Math.sqrt(liquidityUsd / 1000);
    const volumeAdj = volume24h > 0 ? 0.9 : 1.1;
    return Math.max(0.05, Math.min(base * volumeAdj * 100, 10));
  }

  private detectRiskFlags(
    pair: DexPair,
    liquidityUsd: number,
    priceUsd: number
  ): string[] {
    const flags: string[] = [];

    if (liquidityUsd < MIN_LIQUIDITY_USD) flags.push("low_liquidity");
    if ((pair.volume?.h24 ?? 0) < MIN_VOLUME_24H_USD) flags.push("low_volume");
    if (priceUsd <= 0) flags.push("zero_price");

    const pairAge = pair.pairCreatedAt
      ? Date.now() - pair.pairCreatedAt
      : Infinity;
    if (pairAge < 24 * 60 * 60 * 1000) flags.push("very_new_pair");

    const txns24h = pair.txns?.h24;
    if (txns24h) {
      const total = txns24h.buys + txns24h.sells;
      if (total > 0 && txns24h.sells === 0) flags.push("no_sells_24h");
      if (total > 0 && txns24h.buys === 0) flags.push("no_buys_24h");
    }

    return flags;
  }

  private calcHealthScore(params: {
    liquidityUsd: number;
    volume24hUsd: number;
    spreadPct: number;
    top10ConcentrationPct: number | null;
    contractRiskFlags: string[];
    pairAge: number | null;
  }): number {
    let score = 50;

    // Liquidez (0–25 pts)
    if (params.liquidityUsd >= 1_000_000) score += 25;
    else if (params.liquidityUsd >= 500_000) score += 20;
    else if (params.liquidityUsd >= 100_000) score += 15;
    else if (params.liquidityUsd >= MIN_LIQUIDITY_USD) score += 8;
    else score -= 15;

    // Volumen (0–20 pts)
    if (params.volume24hUsd >= 500_000) score += 20;
    else if (params.volume24hUsd >= 100_000) score += 15;
    else if (params.volume24hUsd >= MIN_VOLUME_24H_USD) score += 8;
    else score -= 10;

    // Spread (0–15 pts)
    if (params.spreadPct <= 0.3) score += 15;
    else if (params.spreadPct <= 1) score += 10;
    else if (params.spreadPct <= MAX_SPREAD_PCT) score += 3;
    else score -= 10;

    // Concentración holders (0–15 pts, solo si hay data)
    if (params.top10ConcentrationPct !== null) {
      if (params.top10ConcentrationPct <= 0.4) score += 15;
      else if (params.top10ConcentrationPct <= 0.6) score += 10;
      else if (params.top10ConcentrationPct <= MAX_TOP10_CONCENTRATION) score += 3;
      else score -= 10;
    }

    // Risk flags (-5 pts cada uno)
    score -= params.contractRiskFlags.length * 5;

    // Antigüedad del par
    if (params.pairAge) {
      const ageDays = (Date.now() - params.pairAge) / (24 * 60 * 60 * 1000);
      if (ageDays >= 30) score += 5;
      else if (ageDays < 1) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private async persistSnapshot(
    result: TokenHealthResult,
    userId: string
  ): Promise<void> {
    let tokenId = result.tokenId;

    if (!tokenId) {
      const { data: existing } = await this.supabase
        .from("token_registry")
        .select("id")
        .eq("user_id", userId)
        .ilike("address", result.tokenAddress)
        .eq("network", result.network)
        .limit(1)
        .single();

      if (existing) {
        tokenId = existing.id;
      } else {
        const { data: created } = await this.supabase
          .from("token_registry")
          .insert({
            user_id: userId,
            address: result.tokenAddress.toLowerCase(),
            network: result.network,
            symbol: result.symbol,
            name: result.bestPair?.baseToken.name ?? result.symbol,
          })
          .select("id")
          .single();

        tokenId = created?.id ?? "";
      }
    }

    if (!tokenId) return;

    result.tokenId = tokenId;

    await this.supabase.from("token_health_snapshots").insert({
      token_id: tokenId,
      liquidity_usd: result.liquidityUsd,
      volume_24h_usd: result.volume24hUsd,
      spread_pct: result.spreadPct,
      holders_count: result.holdersCount,
      top10_concentration_pct: result.top10ConcentrationPct,
      contract_risk_flags: result.contractRiskFlags,
      health_score: result.healthScore,
    });
  }
}
