"use client";

import { WalletShell } from "@/components/wallet/WalletShell";
import { t } from "@/lib/wallet/i18n";

export default function WalletSwapPage() {
  return (
    <WalletShell gradient>
      <div className="wallet-screen pt-4">
        <h1 className="wallet-page-title">{t.swapTitle}</h1>
        <p className="wallet-page-subtitle">{t.swapSubtitle}</p>

        <div className="wallet-empty min-h-[45vh]">
          <div className="wallet-empty-icon">
            <svg className="h-8 w-8 text-wallet-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-wallet-muted">{t.swapComingSoon}</p>
        </div>
      </div>
    </WalletShell>
  );
}
