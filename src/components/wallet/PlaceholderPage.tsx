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
    <WalletShell>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center">
        <span className="text-5xl">{emoji}</span>
        <h2 className="mt-5 text-xl font-bold text-wallet-text">{title}</h2>
        <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-wallet-muted">
          {description}
        </p>
      </div>
    </WalletShell>
  );
}
