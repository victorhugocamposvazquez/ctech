"use client";

import { useQuery } from "@tanstack/react-query";
import type { DexPair } from "@/lib/market/dexscreener";
import { formatUsd } from "@/lib/wallet/format";
import { t } from "@/lib/wallet/i18n";

async function fetchBscTrending(): Promise<DexPair[]> {
  const res = await fetch(
    "https://api.dexscreener.com/latest/dex/search?q=bnb"
  );
  if (!res.ok) throw new Error("fetch failed");
  const data = (await res.json()) as { pairs: DexPair[] | null };
  return (data.pairs ?? [])
    .filter((p) => p.chainId === "bsc")
    .sort((a, b) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0))
    .slice(0, 15);
}

export function TrendingList() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["wallet-trending-bsc"],
    queryFn: fetchBscTrending,
    staleTime: 120_000,
  });

  if (isLoading) {
    return (
      <div className="wallet-card wallet-card-inner py-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="wallet-skeleton my-3 h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !data?.length) {
    return (
      <div className="wallet-empty py-12">
        <p className="font-semibold text-wallet-text">{t.trendingEmpty}</p>
        <button type="button" onClick={() => void refetch()} className="wallet-btn-secondary mt-4 max-w-xs">
          {t.retry}
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-settings-group">
      {data.map((pair) => {
        const change = pair.priceChange?.h24 ?? 0;
        const up = change >= 0;
        return (
          <a
            key={pair.pairAddress}
            href={pair.url}
            target="_blank"
            rel="noopener noreferrer"
            className="wallet-link-row"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-wallet-text">
                {pair.baseToken.symbol}
                <span className="ml-2 text-xs font-normal text-wallet-muted">
                  / {pair.quoteToken.symbol}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-wallet-muted">
                {t.volume24h}: {formatUsd(pair.volume?.h24 ?? 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-wallet-text">
                ${Number(pair.priceUsd).toFixed(4)}
              </p>
              <p className={up ? "wallet-badge-change-up" : "wallet-badge-change-down"}>
                {up ? "+" : ""}
                {change.toFixed(2)}%
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
