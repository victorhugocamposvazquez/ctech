import type { DexPair } from "./dexscreener";

const BASE_URL = "https://public-api.birdeye.so";

type BirdeyeTokenLike = {
  address?: string;
  mint?: string;
  tokenAddress?: string;
};

type BirdeyeListResponse = {
  data?: unknown;
  success?: boolean;
};

/**
 * Birdeye client focused on Solana token discovery.
 *
 * It normalizes a few known response shapes and returns token addresses
 * that detectors can later enrich with DexScreener pairs.
 */
export class BirdeyeClient {
  private apiKey: string;
  private lastRequestMs = 0;
  private readonly minIntervalMs = 1100;

  constructor() {
    this.apiKey = process.env.BIRDEYE_API_KEY ?? "";
    if (!this.apiKey) {
      throw new Error("BIRDEYE_API_KEY no configurada");
    }
  }

  async getTrendingTokenAddresses(limit = 50): Promise<string[]> {
    const body = await this.fetchWithFallback([
      `/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=${limit}`,
      `/defi/v3/token/trending?sort_by=rank&sort_type=asc&offset=0&limit=${limit}`,
    ]);
    return uniqueAddresses(extractAddressList(body));
  }

  async getNewTokenAddresses(limit = 50): Promise<string[]> {
    const body = await this.fetchWithFallback([
      `/defi/v2/tokens/new_listing?offset=0&limit=${limit}`,
      `/defi/token_new_listing?offset=0&limit=${limit}`,
      `/defi/v3/token/new_listing?offset=0&limit=${limit}`,
    ]);
    return uniqueAddresses(extractAddressList(body));
  }

  async getTrendingPairs(limit = 50): Promise<DexPair[]> {
    const addresses = await this.getTrendingTokenAddresses(limit);
    return this.addressesToPairs(addresses);
  }

  async getNewPairs(limit = 50): Promise<DexPair[]> {
    const addresses = await this.getNewTokenAddresses(limit);
    return this.addressesToPairs(addresses);
  }

  private async addressesToPairs(addresses: string[]): Promise<DexPair[]> {
    const pairs: DexPair[] = [];
    for (const address of addresses) {
      const pair = await this.fetchDexPairByAddress(address);
      if (pair) pairs.push(pair);
    }
    return pairs;
  }

  private async fetchDexPairByAddress(address: string): Promise<DexPair | null> {
    await this.throttle();
    const url = `https://api.dexscreener.com/tokens/v1/solana/${address}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as DexPair[] | { pairs?: DexPair[] | null };
    const pairs = Array.isArray(data) ? data : data.pairs ?? [];
    if (!pairs.length) return null;
    return pairs.reduce((best, p) =>
      (p.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0) ? p : best
    );
  }

  private async fetchWithFallback(paths: string[]): Promise<unknown> {
    let lastError: unknown;
    for (const path of paths) {
      try {
        await this.throttle();
        const res = await fetch(`${BASE_URL}${path}`, {
          headers: {
            "X-API-KEY": this.apiKey,
            "x-chain": "solana",
            accept: "application/json",
          },
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          throw new Error(`Birdeye ${res.status}: ${msg}`);
        }
        return (await res.json()) as BirdeyeListResponse;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Birdeye request failed");
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const wait = this.minIntervalMs - (now - this.lastRequestMs);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastRequestMs = Date.now();
  }
}

function extractAddressList(payload: unknown): string[] {
  const root = payload as BirdeyeListResponse | undefined;
  const data = root?.data as unknown;

  if (Array.isArray(data)) {
    return data
      .map((x) => getAddress(x as BirdeyeTokenLike))
      .filter(Boolean) as string[];
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["tokens", "items", "list", "result"]) {
      const val = obj[key];
      if (Array.isArray(val)) {
        return val
          .map((x) => getAddress(x as BirdeyeTokenLike))
          .filter(Boolean) as string[];
      }
    }
  }

  return [];
}

function getAddress(token: BirdeyeTokenLike): string | null {
  const raw = token.address ?? token.mint ?? token.tokenAddress;
  if (!raw) return null;
  return String(raw).trim();
}

function uniqueAddresses(addresses: string[]): string[] {
  return [...new Set(addresses.filter(Boolean))];
}
