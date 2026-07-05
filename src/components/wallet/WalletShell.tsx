"use client";

import { type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { WalletHeader } from "./WalletHeader";
import { InstallBottomBanner } from "./InstallBanner";
import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";

export function WalletShell({
  children,
  address,
  hideNav,
  hideHeader,
  gradient,
}: {
  children: ReactNode;
  address?: string;
  hideNav?: boolean;
  hideHeader?: boolean;
  gradient?: boolean;
}) {
  const { showInstallBanner } = useInstallPrompt();

  const mainPb = hideNav
    ? showInstallBanner
      ? "wallet-main-pb-compact"
      : "wallet-main-pb-min"
    : showInstallBanner
      ? "wallet-main-pb-nav-banner"
      : "wallet-main-pb-nav";

  return (
    <div
      className={`wallet-theme w-full min-h-dvh text-wallet-text ${
        gradient ? "wallet-gradient-top" : "bg-wallet-bg"
      }`}
    >
      {!hideHeader && <WalletHeader address={address} showWalletSelector={!hideNav} />}

      <main className={`${mainPb} wallet-gutter-x`}>{children}</main>

      {!hideNav && <BottomNav />}
      <InstallBottomBanner aboveNav={!hideNav} />
    </div>
  );
}
