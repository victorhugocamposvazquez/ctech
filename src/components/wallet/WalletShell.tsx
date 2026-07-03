"use client";

import { type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { APP_NAME } from "@/lib/wallet/config";

export function WalletShell({
  children,
  title,
  hideNav,
}: {
  children: ReactNode;
  title?: string;
  hideNav?: boolean;
}) {
  return (
    <div className="wallet-theme mx-auto min-h-dvh max-w-lg bg-wallet-bg text-wallet-text">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-wallet-border/50 bg-wallet-bg/90 px-4 py-3 backdrop-blur-md safe-top">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wallet-accent">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v11A2.5 2.5 0 0117.5 20h-11A2.5 2.5 0 014 17.5v-11z" />
            </svg>
          </div>
          <span className="font-semibold">{title ?? APP_NAME}</span>
        </div>
      </header>

      <main className={hideNav ? "pb-8" : "pb-24"}>{children}</main>

      {!hideNav && <BottomNav />}
    </div>
  );
}
