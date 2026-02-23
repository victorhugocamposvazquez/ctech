import type {
  ArkhamTransfersResponse,
  ArkhamSwapsResponse,
  ArkhamAddressInfo,
  ArkhamTokenMarket,
  ArkhamTokenHoldersResponse,
  TransfersQuery,
  SwapsQuery,
} from "./types";

const BASE_URL = "https://api.arkm.com";
const MIN_REQUEST_INTERVAL_MS = 1_050; // >1 req/s rate limit

/**
 * Cliente ligero para Arkham Intelligence API.
 *
 * Rate limiting integrado: las peticiones se encolan automáticamente
 * para respetar el límite de 1 req/s de los endpoints de transfers/swaps.
 */
export class ArkhamClient {
  private apiKey: string;
  private lastRequestAt = 0;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.ARKHAM_API_KEY;
    if (!key) {
      throw new Error(
        "ARKHAM_API_KEY no configurada. Añádela a .env.local o pásala al constructor."
      );
    }
    this.apiKey = key;
  }

  // --------------- Transfers ---------------

  async getTransfers(query: TransfersQuery): Promise<ArkhamTransfersResponse> {
    return this.get<ArkhamTransfersResponse>("/transfers", query);
  }

  // --------------- Swaps (DEX trades) ---------------

  async getSwaps(query: SwapsQuery): Promise<ArkhamSwapsResponse> {
    return this.get<ArkhamSwapsResponse>("/swaps", query);
  }

  // --------------- Address Intelligence ---------------

  async getAddressIntelligence(
    address: string,
    chain?: string
  ): Promise<ArkhamAddressInfo> {
    const params: Record<string, string> = {};
    if (chain) params.chain = chain;
    return this.get<ArkhamAddressInfo>(
      `/intelligence/address/${encodeURIComponent(address)}`,
      params
    );
  }

  // --------------- Token Market Data ---------------

  async getTokenMarket(coingeckoId: string): Promise<ArkhamTokenMarket> {
    return this.get<ArkhamTokenMarket>(
      `/token/market/${encodeURIComponent(coingeckoId)}`
    );
  }

  // --------------- Token Holders ---------------

  async getTokenHolders(
    chain: string,
    tokenAddress: string,
    groupByEntity = false
  ): Promise<ArkhamTokenHoldersResponse> {
    const params: Record<string, string> = {};
    if (groupByEntity) params.groupByEntity = "true";
    return this.get<ArkhamTokenHoldersResponse>(
      `/token/holders/${encodeURIComponent(chain)}/${encodeURIComponent(tokenAddress)}`,
      params
    );
  }

  // --------------- HTTP layer ---------------

  private async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined | null>
  ): Promise<T> {
    await this.throttle();

    const url = new URL(path, BASE_URL);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const res = await fetch(url.toString(), {
      headers: { "API-Key": this.apiKey },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ArkhamApiError(res.status, body, url.pathname);
    }

    return res.json() as Promise<T>;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
    }
    this.lastRequestAt = Date.now();
  }
}

export class ArkhamApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public path: string
  ) {
    super(`Arkham API ${status} en ${path}: ${body.slice(0, 300)}`);
    this.name = "ArkhamApiError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
