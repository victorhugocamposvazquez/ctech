import { DexScreenerClient } from "@/lib/market/dexscreener";
import { walletChainSlug } from "./tokens";

const dexClient = new DexScreenerClient();

export interface TokenPrice {
  price: number;
  change24h: number | null;
}

let bnbCache: { price: number; change24h: number; at: number } | null = null;

export async function fetchBnbUsd(): Promise<{ price: number; change24h: number }> {
  if (bnbCache && Date.now() - bnbCache.at < 60_000) {
    return { price: bnbCache.price, change24h: bnbCache.change24h };
  }
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd&include_24hr_change=true"
    );
    if (!res.ok) throw new Error("coingecko");
    const data = (await res.json()) as {
      binancecoin?: { usd?: number; usd_24h_change?: number };
    };
    const price = data.binancecoin?.usd ?? 0;
    const change24h = data.binancecoin?.usd_24h_change ?? 0;
    bnbCache = { price, change24h, at: Date.now() };
    return { price, change24h };
  } catch {
    return { price: bnbCache?.price ?? 0, change24h: bnbCache?.change24h ?? 0 };
  }
}

export async function fetchTokenUsd(
  tokenAddress: string
): Promise<TokenPrice | null> {
  try {
    const pairs = await dexClient.getTokenPairs(walletChainSlug, tokenAddress);
    const best = pairs
      .filter((p) => p.priceUsd && Number(p.priceUsd) > 0)
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    if (!best?.priceUsd) return null;
    return {
      price: Number(best.priceUsd),
      change24h: best.priceChange?.h24 ?? null,
    };
  } catch {
    return null;
  }
}
