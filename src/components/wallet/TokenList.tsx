"use client";

import Image from "next/image";
import { formatTokenAmount, formatUsd } from "@/lib/wallet/format";
import type { PortfolioAsset } from "@/hooks/wallet/usePortfolio";

function TokenRow({ asset }: { asset: PortfolioAsset }) {
  const { token, usdValue } = asset;
  const hasBalance = asset.rawBalance > 0n;

  return (
    <div className="wallet-token-row">
      <div className="wallet-token-icon">
        <Image
          src={token.logo}
          alt={token.symbol}
          width={44}
          height={44}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold leading-tight text-wallet-text">
          {token.symbol}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-wallet-muted">{token.name}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[16px] font-semibold tabular-nums tracking-tight text-wallet-text">
          {hasBalance ? formatUsd(usdValue) : "$0.00"}
        </p>
        <p className="mt-0.5 text-[13px] tabular-nums text-wallet-muted">
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
      <div className="wallet-card wallet-card-inner py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-4">
            <div className="wallet-skeleton h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="wallet-skeleton h-4 w-16" />
              <div className="wallet-skeleton h-3 w-28" />
            </div>
            <div className="wallet-skeleton h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const sorted = [...assets].sort((a, b) => b.usdValue - a.usdValue);

  if (sorted.length === 0) {
    return (
      <div className="wallet-empty">
        <div className="wallet-empty-icon">◎</div>
        <p className="font-semibold text-wallet-text">No crypto yet</p>
        <p className="mt-1 text-sm text-wallet-muted">Buy or receive to get started</p>
      </div>
    );
  }

  return (
    <div className="wallet-card wallet-card-inner">
      {sorted.map((asset) => (
        <TokenRow key={asset.token.id} asset={asset} />
      ))}
    </div>
  );
}
