/**
 * Cliente para DexScreener API (gratuita, sin API key).
 * Fuente principal de precio, liquidez y volumen de tokens DeFi.
 *
 * Docs: https://docs.dexscreener.com/api/reference
 * Rate limit: 60 req/min
 */

const BASE_URL = "https://api.dexscreener.com";

const CHAIN_MAP: Record<string, string> = {
  ethereum: "ethereum",
  base: "base",
  arbitrum: "arbitrum",
  optimism: "optimism",
  polygon: "polygon",
  bsc: "bsc",
  solana: "solana",
  avalanche: "avalanche",
};

export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: { m5: number; h1: number; h6: number; h24: number };
  priceChange: { m5: number; h1: number; h6: number; h24: number };
  liquidity: { usd: number; base: number; quote: number };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
}

export interface DexTokenResponse {
  pairs: DexPair[] | null;
}

export class DexScreenerClient {
  /**
   * Obtiene datos de pares para un token en una chain específica.
   * GET /tokens/v1/{chainId}/{tokenAddress}
   */
  async getTokenPairs(
    network: string,
    tokenAddress: string
  ): Promise<DexPair[]> {
    const chainId = CHAIN_MAP[network.toLowerCase()] ?? network.toLowerCase();
    const url = `${BASE_URL}/tokens/v1/${chainId}/${tokenAddress}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`DexScreener ${res.status}: ${await res.text().catch(() => "")}`);
    }

    const data: DexPair[] | DexTokenResponse = await res.json();

    if (Array.isArray(data)) return data;
    return data.pairs ?? [];
  }

  /**
   * Busca pares por símbolo de token (útil si no tienes la address).
   * GET /latest/dex/search?q={query}
   */
  async search(query: string): Promise<DexPair[]> {
    const url = `${BASE_URL}/latest/dex/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`DexScreener search ${res.status}`);
    }

    const data = (await res.json()) as { pairs: DexPair[] | null };
    return data.pairs ?? [];
  }

  /**
   * Selecciona el "mejor" par de un token: mayor liquidez USD.
   */
  async getBestPair(
    network: string,
    tokenAddress: string
  ): Promise<DexPair | null> {
    const pairs = await this.getTokenPairs(network, tokenAddress);
    if (pairs.length === 0) return null;

    return pairs.reduce((best, p) =>
      (p.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0) ? p : best
    );
  }
}
