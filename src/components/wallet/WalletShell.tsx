"use client";

import { type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { WalletHeader } from "./WalletHeader";

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
  return (
    <div
      className={`wallet-theme mx-auto min-h-dvh max-w-lg text-wallet-text ${
        gradient ? "wallet-gradient-top" : "bg-wallet-bg"
      }`}
    >
      {!hideHeader && <WalletHeader address={address} showWalletSelector={!hideNav} />}

      <main className={hideNav ? "pb-8" : "pb-[88px]"}>{children}</main>

      {!hideNav && <BottomNav />}
    </div>
  );
}
