"use client";

import { type ReactNode } from "react";
import { useWalletSession } from "@/hooks/wallet/useWalletSession";
import { ConnectScreen } from "./ConnectScreen";
import { UnlockScreen } from "./onboarding/UnlockScreen";

export function WalletAuthGate({ children }: { children: ReactNode }) {
  const { localStatus, needsOnboarding, needsUnlock, isConnected } =
    useWalletSession();

  if (localStatus === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-wallet-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-wallet-accent border-t-transparent" />
      </div>
    );
  }

  if (needsUnlock) {
    return <UnlockScreen />;
  }

  if (needsOnboarding && !isConnected) {
    return <ConnectScreen />;
  }

  return <>{children}</>;
}
