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
      ? "pb-28"
      : "pb-8"
    : showInstallBanner
      ? "pb-[148px]"
      : "pb-[88px]";

  return (
    <div
      className={`wallet-theme mx-auto min-h-dvh max-w-lg text-wallet-text ${
        gradient ? "wallet-gradient-top" : "bg-wallet-bg"
      }`}
    >
      {!hideHeader && <WalletHeader address={address} showWalletSelector={!hideNav} />}

      <main className={mainPb}>{children}</main>

      {!hideNav && <BottomNav />}
      <InstallBottomBanner aboveNav={!hideNav} />
    </div>
  );
}
