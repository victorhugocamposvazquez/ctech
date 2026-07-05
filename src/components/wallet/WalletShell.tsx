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
      : "wallet-main-pb-tight";

  const shellClass = hideNav ? "wallet-shell--free-scroll" : "wallet-shell--docked-nav";

  return (
    <div
      className={`wallet-shell ${shellClass} wallet-theme w-full text-wallet-text ${
        gradient ? "wallet-gradient-top" : "bg-wallet-bg"
      }`}
    >
      {!hideHeader && <WalletHeader address={address} showWalletSelector={!hideNav} />}

      <main className={`wallet-shell-main ${mainPb} wallet-gutter-x`}>{children}</main>

      {!hideNav && <BottomNav />}
      <InstallBottomBanner aboveNav={!hideNav} />
    </div>
  );
}
