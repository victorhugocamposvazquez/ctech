"use client";

import { WalletShell } from "@/components/wallet/WalletShell";

export function PlaceholderPage({
  title,
  description,
  emoji,
}: {
  title: string;
  description: string;
  emoji: string;
}) {
  return (
    <WalletShell gradient>
      <div className="wallet-empty min-h-[55vh]">
        <div className="wallet-empty-icon">{emoji}</div>
        <h2 className="text-xl font-bold text-wallet-text">{title}</h2>
        <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-wallet-muted">
          {description}
        </p>
      </div>
    </WalletShell>
  );
}
