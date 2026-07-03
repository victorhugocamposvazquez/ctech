"use client";

import Image from "next/image";
import { formatTokenAmount, formatUsd } from "@/lib/wallet/format";
import type { PortfolioAsset } from "@/hooks/wallet/usePortfolio";

function TokenRow({ asset }: { asset: PortfolioAsset }) {
  const { token, usdValue } = asset;
  const hasBalance = asset.rawBalance > 0n;

  return (
    <div className="wallet-token-row flex items-center gap-3 py-3.5">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-wallet-elevated ring-1 ring-wallet-border">
        <Image
          src={token.logo}
          alt={token.symbol}
          width={40}
          height={40}
          className="h-10 w-10 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-tight text-wallet-text">
          {token.symbol}
        </p>
        <p className="truncate text-[13px] text-wallet-muted">{token.name}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[15px] font-semibold tabular-nums text-wallet-text">
          {hasBalance ? formatUsd(usdValue) : "$0.00"}
        </p>
        <p className="text-[13px] tabular-nums text-wallet-muted">
          {formatTokenAmount(asset.rawBalance, token.decimals, 5)} {token.symbol}
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
      <div className="space-y-0 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3.5">
            <div className="h-10 w-10 animate-pulse rounded-full bg-wallet-elevated" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-wallet-elevated" />
              <div className="h-3 w-24 animate-pulse rounded bg-wallet-elevated" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded bg-wallet-elevated" />
          </div>
        ))}
      </div>
    );
  }

  const sorted = [...assets].sort((a, b) => b.usdValue - a.usdValue);

  return (
    <div>
      {sorted.map((asset) => (
        <TokenRow key={asset.token.id} asset={asset} />
      ))}
      {sorted.length === 0 && (
        <p className="py-12 text-center text-sm text-wallet-muted">
          No crypto yet
        </p>
      )}
    </div>
  );
}
