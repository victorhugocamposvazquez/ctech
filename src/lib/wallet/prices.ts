import { DexScreenerClient } from "@/lib/market/dexscreener";
import { walletChainSlug } from "./tokens";

const dexClient = new DexScreenerClient();

const BNB_COINGECKO =
  "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd";

let bnbCache: { price: number; at: number } | null = null;

export async function fetchBnbUsd(): Promise<number> {
  if (bnbCache && Date.now() - bnbCache.at < 60_000) {
    return bnbCache.price;
  }
  try {
    const res = await fetch(BNB_COINGECKO, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error("coingecko");
    const data = (await res.json()) as { binancecoin?: { usd?: number } };
    const price = data.binancecoin?.usd ?? 0;
    bnbCache = { price, at: Date.now() };
    return price;
  } catch {
    return bnbCache?.price ?? 0;
  }
}

export async function fetchTokenUsd(
  tokenAddress: string
): Promise<number | null> {
  try {
    const pairs = await dexClient.getTokenPairs(walletChainSlug, tokenAddress);
    const best = pairs
      .filter((p) => p.priceUsd && Number(p.priceUsd) > 0)
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    if (!best?.priceUsd) return null;
    return Number(best.priceUsd);
  } catch {
    return null;
  }
}
