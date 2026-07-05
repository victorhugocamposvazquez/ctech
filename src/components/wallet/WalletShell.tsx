"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BottomNav } from "./BottomNav";
import { WalletHeader } from "./WalletHeader";
import { InstallBottomBanner } from "./InstallBanner";
import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";
import { useWalletTheme } from "@/contexts/WalletThemeContext";

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
  const { themeClass } = useWalletTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mainPb = hideNav
    ? showInstallBanner
      ? "wallet-main-pb-compact"
      : "wallet-main-pb-min"
    : showInstallBanner
      ? "wallet-main-pb-nav-banner"
      : "wallet-main-pb-nav";

  const navPortal =
    mounted && !hideNav
      ? createPortal(
          <div className={`wallet-theme ${themeClass}`}>
            <BottomNav />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className={`wallet-shell wallet-theme w-full min-h-dvh text-wallet-text ${
          gradient ? "wallet-gradient-top" : "bg-wallet-bg"
        }`}
      >
        {!hideHeader && <WalletHeader address={address} showWalletSelector={!hideNav} />}

        <main className={`wallet-shell-main ${mainPb} wallet-gutter-x`}>{children}</main>

        <InstallBottomBanner aboveNav={!hideNav} />
      </div>
      {navPortal}
    </>
  );
}
