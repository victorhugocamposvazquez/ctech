"use client";

import { type ReactNode } from "react";
import { useWalletSession } from "@/hooks/wallet/useWalletSession";
import { ConnectScreen } from "./ConnectScreen";
import { UnlockScreen } from "./onboarding/UnlockScreen";
import { InstallBottomBanner } from "./InstallBanner";
import { WalletNotificationProvider } from "@/contexts/WalletNotificationContext";
import { WalletAuthScreen } from "@/components/wallet/WalletAuthScreen";
import { t } from "@/lib/wallet/i18n";

export function WalletAuthGate({ children }: { children: ReactNode }) {
  const { localStatus, needsOnboarding, needsUnlock, isConnected, addingWallet } =
    useWalletSession();

  if (localStatus === "loading") {
    return (
      <WalletAuthScreen centered className="bg-wallet-bg">
        <div className="wallet-hero-glow flex flex-col items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-wallet-accent border-t-transparent" />
          <p className="mt-6 text-sm font-medium text-wallet-muted">{t.loading}</p>
        </div>
      </WalletAuthScreen>
    );
  }

  if (addingWallet && !isConnected) {
    return (
      <>
        <ConnectScreen />
        <InstallBottomBanner aboveNav={false} />
      </>
    );
  }

  if (needsUnlock) {
    return <UnlockScreen />;
  }

  if (needsOnboarding && !isConnected) {
    return (
      <>
        <ConnectScreen />
        <InstallBottomBanner aboveNav={false} />
      </>
    );
  }

  return (
    <>
      <WalletNotificationProvider>{children}</WalletNotificationProvider>
    </>
  );
}
