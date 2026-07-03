"use client";

import { WalletShell } from "@/components/wallet/WalletShell";
import { t } from "@/lib/wallet/i18n";

export default function DiscoverPage() {
  return (
    <WalletShell gradient>
      <div className="wallet-screen pt-4">
        <h1 className="wallet-page-title">{t.discoverTitle}</h1>
        <p className="wallet-page-subtitle">{t.discoverSubtitle}</p>

        <div className="wallet-empty min-h-[45vh]">
          <div className="wallet-empty-icon">🔍</div>
          <p className="max-w-xs text-sm leading-relaxed text-wallet-muted">{t.discoverEmpty}</p>
        </div>
      </div>
    </WalletShell>
  );
}
