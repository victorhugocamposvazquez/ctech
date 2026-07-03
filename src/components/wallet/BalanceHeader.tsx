"use client";

import { formatUsd, shortenAddress } from "@/lib/wallet/format";

interface BalanceHeaderProps {
  totalUsd: number;
  address?: string;
  isLoading?: boolean;
}

export function BalanceHeader({
  totalUsd,
  address,
  isLoading,
}: BalanceHeaderProps) {
  return (
    <div className="px-4 pt-2 pb-6">
      <p className="text-sm font-medium text-wallet-muted">Balance total</p>
      <div className="mt-1 flex items-baseline gap-2">
        {isLoading ? (
          <div className="h-10 w-48 animate-pulse rounded-lg bg-wallet-border" />
        ) : (
          <h1 className="text-4xl font-bold tracking-tight text-wallet-text">
            {formatUsd(totalUsd)}
          </h1>
        )}
      </div>
      {address && (
        <p className="mt-2 font-mono text-xs text-wallet-muted">
          {shortenAddress(address, 6)}
        </p>
      )}
    </div>
  );
}
