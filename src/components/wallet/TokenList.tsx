"use client";

import Image from "next/image";
import { formatTokenAmount, formatUsd } from "@/lib/wallet/format";
import type { PortfolioAsset } from "@/hooks/wallet/usePortfolio";

function TokenRow({ asset }: { asset: PortfolioAsset }) {
  const { token, balance, usdValue, usdPrice } = asset;
  const showPrice = token.fixedUsdPrice === undefined && usdPrice > 0;

  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition hover:bg-wallet-card/80">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-wallet-border">
        <Image
          src={token.logo}
          alt={token.symbol}
          width={44}
          height={44}
          className="h-11 w-11 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span className="absolute text-xs font-bold text-wallet-text">
          {token.symbol.slice(0, 2)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-wallet-text">{token.name}</p>
        <p className="text-xs text-wallet-muted">
          {showPrice ? formatUsd(usdPrice) : token.symbol}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold tabular-nums text-wallet-text">
          {formatTokenAmount(asset.rawBalance, token.decimals, 4)}
        </p>
        <p className="text-xs tabular-nums text-wallet-muted">
          {formatUsd(usdValue)}
        </p>
      </div>
    </div>
  );
}

export function TokenList({
  assets,
  isLoading,
}: {
  assets: PortfolioAsset[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 px-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-2xl bg-wallet-card"
          />
        ))}
      </div>
    );
  }

  const sorted = [...assets].sort((a, b) => b.usdValue - a.usdValue);

  return (
    <div className="px-2">
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-wallet-muted">
        Activos
      </p>
      <div className="rounded-2xl bg-wallet-card/60">
        {sorted.map((asset) => (
          <TokenRow key={asset.token.id} asset={asset} />
        ))}
        {sorted.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-wallet-muted">
            Sin activos en esta red
          </p>
        )}
      </div>
    </div>
  );
}
