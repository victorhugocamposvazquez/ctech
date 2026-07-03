"use client";

import { WalletShell } from "@/components/wallet/WalletShell";
import { TrendingList } from "@/components/wallet/TrendingList";
import { t } from "@/lib/wallet/i18n";

export default function TrendingPage() {
  return (
    <WalletShell gradient>
      <div className="wallet-screen pt-4">
        <h1 className="wallet-page-title">{t.trendingTitle}</h1>
        <p className="wallet-page-subtitle">{t.trendingSubtitle}</p>
        <div className="mt-6">
          <TrendingList />
        </div>
      </div>
    </WalletShell>
  );
}
