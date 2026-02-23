/**
 * Cliente para GeckoTerminal API (CoinGecko on-chain, gratuita, sin API key).
 * Fuente principal de descubrimiento de tokens trending en DEXs.
 *
 * Docs: https://www.geckoterminal.com/dex-api
 * Rate limit: ~30 req/min (free tier)
 */

const BASE_URL = "https://api.geckoterminal.com/api/v2";

const NETWORK_MAP: Record<string, string> = {
  ethereum: "eth",
  base: "base",
  solana: "solana",
  arbitrum: "arbitrum",
  optimism: "optimism",
  polygon: "polygon_pos",
  bsc: "bsc",
  avalanche: "avax",
};

export interface GeckoTerminalPoolAttributes {
  address: string;
  name: string;
  pool_created_at: string | null;
  base_token_price_usd: string | null;
  base_token_price_native_currency: string | null;
  fdv_usd: string | null;
  market_cap_usd: string | null;
  reserve_in_usd: string | null;
  price_change_percentage: {
    m5: string; m15: string; m30: string;
    h1: string; h6: string; h24: string;
  };
  transactions: {
    m5:  { buys: number; sells: number; buyers: number; sellers: number };
    m15: { buys: number; sells: number; buyers: number; sellers: number };
    m30: { buys: number; sells: number; buyers: number; sellers: number };
    h1:  { buys: number; sells: number; buyers: number; sellers: number };
    h6:  { buys: number; sells: number; buyers: number; sellers: number };
    h24: { buys: number; sells: number; buyers: number; sellers: number };
  };
  volume_usd: {
    m5: string; m15: string; m30: string;
    h1: string; h6: string; h24: string;
  };
}

export interface GeckoTerminalPool {
  id: string;
  type: string;
  attributes: GeckoTerminalPoolAttributes;
  relationships: {
    base_token:  { data: { id: string; type: string } };
    quote_token: { data: { id: string; type: string } };
    network:     { data: { id: string; type: string } };
    dex:         { data: { id: string; type: string } };
  };
}

export interface GeckoTerminalToken {
  id: string;
  type: string;
  attributes: {
    address: string;
    name: string;
    symbol: string;
    coingecko_coin_id: string | null;
  };
}

interface GeckoTerminalResponse {
  data: GeckoTerminalPool[];
  included?: GeckoTerminalToken[];
}

export class GeckoTerminalClient {
  private lastRequestMs = 0;
  private readonly minIntervalMs = 2100;

  private async throttle(): Promise<void> {
    const now = Date.now();
    const wait = this.minIntervalMs - (now - this.lastRequestMs);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastRequestMs = Date.now();
  }

  /**
   * Trending pools de una red específica o global.
   * Incluye base_token en la respuesta para obtener nombre/símbolo.
   */
  async getTrendingPools(network?: string): Promise<{
    pools: GeckoTerminalPool[];
    tokens: Map<string, GeckoTerminalToken>;
  }> {
    await this.throttle();

    const netId = network ? (NETWORK_MAP[network] ?? network) : null;
    const path = netId
      ? `/networks/${netId}/trending_pools`
      : `/networks/trending_pools`;

    const url = `${BASE_URL}${path}?include=base_token`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(
        `GeckoTerminal ${res.status}: ${await res.text().catch(() => "")}`
      );
    }

    const body: GeckoTerminalResponse = await res.json();
    const tokenMap = new Map<string, GeckoTerminalToken>();
    for (const t of body.included ?? []) tokenMap.set(t.id, t);

    return { pools: body.data ?? [], tokens: tokenMap };
  }

  /**
   * Trending pools de varias redes. Cada red es una request separada
   * (respeta rate limit interno). Reporta errores por red sin abortar.
   */
  async getTrendingPoolsMultiChain(networks: string[]): Promise<{
    pools: GeckoTerminalPool[];
    tokens: Map<string, GeckoTerminalToken>;
    errors: string[];
  }> {
    const allPools: GeckoTerminalPool[] = [];
    const allTokens = new Map<string, GeckoTerminalToken>();
    const errors: string[] = [];

    for (const net of networks) {
      try {
        const { pools, tokens } = await this.getTrendingPools(net);
        allPools.push(...pools);
        for (const [k, v] of tokens) allTokens.set(k, v);
      } catch (err) {
        errors.push(`${net}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { pools: allPools, tokens: allTokens, errors };
  }

  /**
   * Pools recién creados en una red. Útil para early detection
   * de tokens en fase temprana.
   */
  async getNewPools(network: string): Promise<{
    pools: GeckoTerminalPool[];
    tokens: Map<string, GeckoTerminalToken>;
  }> {
    await this.throttle();

    const netId = NETWORK_MAP[network] ?? network;
    const url = `${BASE_URL}/networks/${netId}/new_pools?include=base_token&page=1`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(
        `GeckoTerminal new_pools ${res.status}: ${await res.text().catch(() => "")}`
      );
    }

    const body: GeckoTerminalResponse = await res.json();
    const tokenMap = new Map<string, GeckoTerminalToken>();
    for (const t of body.included ?? []) tokenMap.set(t.id, t);

    return { pools: body.data ?? [], tokens: tokenMap };
  }

  /**
   * New pools de varias redes.
   */
  async getNewPoolsMultiChain(networks: string[]): Promise<{
    pools: GeckoTerminalPool[];
    tokens: Map<string, GeckoTerminalToken>;
    errors: string[];
  }> {
    const allPools: GeckoTerminalPool[] = [];
    const allTokens = new Map<string, GeckoTerminalToken>();
    const errors: string[] = [];

    for (const net of networks) {
      try {
        const { pools, tokens } = await this.getNewPools(net);
        allPools.push(...pools);
        for (const [k, v] of tokens) allTokens.set(k, v);
      } catch (err) {
        errors.push(`new_pools ${net}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { pools: allPools, tokens: allTokens, errors };
  }

  /**
   * Convierte un network ID de GeckoTerminal al nombre interno del sistema.
   */
  resolveNetwork(gtNetworkId: string): string {
    for (const [internal, gt] of Object.entries(NETWORK_MAP)) {
      if (gt === gtNetworkId) return internal;
    }
    return gtNetworkId;
  }
}
