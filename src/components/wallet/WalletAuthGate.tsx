"use client";

import { type ReactNode } from "react";
import { useWalletSession } from "@/hooks/wallet/useWalletSession";
import { ConnectScreen } from "./ConnectScreen";
import { UnlockScreen } from "./onboarding/UnlockScreen";
import { InstallBottomBanner } from "./InstallBanner";
import { t } from "@/lib/wallet/i18n";

export function WalletAuthGate({ children }: { children: ReactNode }) {
  const { localStatus, needsOnboarding, needsUnlock, isConnected, addingWallet } =
    useWalletSession();

  if (localStatus === "loading") {
    return (
      <div className="wallet-theme flex min-h-dvh flex-col items-center justify-center bg-wallet-bg">
        <div className="wallet-hero-glow">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-wallet-accent border-t-transparent" />
        </div>
        <p className="mt-6 text-sm font-medium text-wallet-muted">{t.loading}</p>
      </div>
    );
  }

  if (addingWallet && !isConnected) {
    return (
      <div className="wallet-theme">
        <ConnectScreen />
        <InstallBottomBanner aboveNav={false} />
      </div>
    );
  }

  if (needsUnlock) {
    return (
      <div className="wallet-theme">
        <UnlockScreen />
        <InstallBottomBanner aboveNav={false} />
      </div>
    );
  }

  if (needsOnboarding && !isConnected) {
    return (
      <div className="wallet-theme">
        <ConnectScreen />
        <InstallBottomBanner aboveNav={false} />
      </div>
    );
  }

  return <>{children}</>;
}
