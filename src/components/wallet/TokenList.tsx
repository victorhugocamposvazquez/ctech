"use client";

import Link from "next/link";
import Image from "next/image";
import { formatUsd, formatTokenAmount } from "@/lib/wallet/format";
import { t } from "@/lib/wallet/i18n";
import type { PortfolioAsset } from "@/hooks/wallet/usePortfolio";

function ChangeBadge({ change }: { change: number | null }) {
  if (change == null) return null;
  const up = change >= 0;
  return (
    <p className={`mt-0.5 text-[13px] tabular-nums ${up ? "wallet-badge-change-up" : "wallet-badge-change-down"}`}>
      {up ? "+" : ""}
      {change.toFixed(2)}%
    </p>
  );
}

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
          {hasBalance ? formatUsd(usdValue) : "$0,00"}
        </p>
        <p className="mt-0.5 text-[13px] tabular-nums text-wallet-muted">
          {formatTokenAmount(asset.rawBalance, token.decimals, 5)} {token.symbol}
        </p>
        <ChangeBadge change={asset.change24h} />
      </div>
    </div>
  );
}

export function TokenList({
  assets,
  isLoading,
  isError,
  onRetry,
}: {
  assets: PortfolioAsset[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
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

  if (isError) {
    return (
      <div className="wallet-empty py-12">
        <p className="font-semibold text-wallet-text">{t.portfolioError}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="wallet-btn-secondary mt-4 max-w-xs">
            {t.retry}
          </button>
        )}
      </div>
    );
  }

  const displayAssets = [...assets].sort((a, b) => {
    const aHas = a.rawBalance > 0n;
    const bHas = b.rawBalance > 0n;
    if (aHas !== bHas) return aHas ? -1 : 1;
    if (b.usdValue !== a.usdValue) return b.usdValue - a.usdValue;
    return a.token.symbol.localeCompare(b.token.symbol);
  });

  if (displayAssets.length === 0) {
    return (
      <div className="wallet-empty py-12">
        <div className="wallet-empty-icon">◎</div>
        <p className="font-semibold text-wallet-text">{t.noCrypto}</p>
        <p className="mt-1 text-sm text-wallet-muted">{t.noCryptoHint}</p>
        <div className="wallet-cta-row mt-4 w-full max-w-xs">
          <Link href="/wallet/receive" className="wallet-btn-primary text-center">
            {t.receive}
          </Link>
          <Link href="/wallet/buy" className="wallet-btn-secondary text-center">
            {t.buy}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-card wallet-card-inner">
      {displayAssets.map((asset) => (
        <TokenRow key={asset.token.id} asset={asset} />
      ))}
    </div>
  );
}
