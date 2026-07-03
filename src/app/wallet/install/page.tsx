"use client";

import { useEffect } from "react";
import { WalletShell } from "@/components/wallet/WalletShell";
import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";
import { TrustShield } from "@/components/wallet/TrustShield";
import { t } from "@/lib/wallet/i18n";

export default function WalletInstallPage() {
  const { install, isStandalone, needsSafari } = useInstallPrompt();

  useEffect(() => {
    if (!isStandalone) install();
  }, [isStandalone, install]);

  if (isStandalone) {
    return (
      <WalletShell hideNav gradient>
        <div className="wallet-empty min-h-[60vh]">
          <TrustShield className="h-20 w-20" />
          <p className="mt-6 text-xl font-bold text-wallet-text">{t.installedApp}</p>
        </div>
      </WalletShell>
    );
  }

  return (
    <WalletShell hideNav gradient>
      <div className="wallet-screen wallet-screen-centered pt-16">
        <TrustShield className="h-20 w-20" />
        <h1 className="mt-6 text-2xl font-bold text-wallet-text">{t.installApp}</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-wallet-muted">
          {needsSafari ? t.iosOpenSafariFirst : t.installTapHint}
        </p>
        <button type="button" onClick={install} className="wallet-btn-primary mt-8 max-w-sm">
          {t.installApp}
        </button>
      </div>
    </WalletShell>
  );
}
