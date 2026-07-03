"use client";

import { WalletShell } from "@/components/wallet/WalletShell";
import { t } from "@/lib/wallet/i18n";

export default function EarnPage() {
  return (
    <WalletShell gradient>
      <div className="wallet-empty min-h-[55vh]">
        <div className="wallet-empty-icon">💰</div>
        <h2 className="text-xl font-bold text-wallet-text">{t.earnTitle}</h2>
        <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-wallet-muted">
          {t.earnSubtitle}
        </p>
        <a
          href="https://pancakeswap.finance/pools"
          target="_blank"
          rel="noopener noreferrer"
          className="wallet-btn-primary mt-8 max-w-xs"
        >
          PancakeSwap Pools
        </a>
      </div>
    </WalletShell>
  );
}
