"use client";

import { type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { WalletHeader } from "./WalletHeader";
import { InstallBottomBanner } from "./InstallBanner";
import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";
import { usePullToRefresh } from "@/hooks/wallet/usePullToRefresh";
import { t } from "@/lib/wallet/i18n";

export function WalletShell({
  children,
  address,
  hideNav,
  hideHeader,
  gradient,
  onPullRefresh,
}: {
  children: ReactNode;
  address?: string;
  hideNav?: boolean;
  hideHeader?: boolean;
  gradient?: boolean;
  onPullRefresh?: () => void | Promise<void>;
}) {
  const { showInstallBanner } = useInstallPrompt();
  const { scrollRef, pull, progress, refreshing, active } = usePullToRefresh(onPullRefresh);

  const mainPb = hideNav
    ? showInstallBanner
      ? "wallet-main-pb-compact"
      : "wallet-main-pb-min"
    : showInstallBanner
      ? "wallet-main-pb-nav-banner"
      : "wallet-main-pb-tight";

  const shellClass = hideNav ? "wallet-shell--free-scroll" : "wallet-shell--docked-nav";
  const pullEnabled = !!onPullRefresh && !hideNav;

  return (
    <div
      className={`wallet-shell ${shellClass} wallet-theme w-full text-wallet-text ${
        gradient ? "wallet-gradient-top" : "bg-wallet-bg"
      }`}
    >
      {!hideHeader && <WalletHeader address={address} showWalletSelector={!hideNav} />}

      <main
        ref={pullEnabled ? scrollRef : undefined}
        className={`wallet-shell-main ${mainPb} wallet-gutter-x ${pullEnabled ? "wallet-shell-main--pull" : ""}`}
      >
        {pullEnabled && (
          <div
            className="wallet-pull-refresh"
            style={{ height: active ? pull : 0, opacity: active ? Math.max(0.35, progress) : 0 }}
            aria-live="polite"
          >
            <div
              className={`wallet-pull-refresh-icon ${refreshing ? "wallet-pull-refresh-icon--spin" : ""}`}
              style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)` }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <span className="wallet-pull-refresh-label">
              {refreshing ? t.refreshingBalance : progress >= 1 ? t.releaseToRefresh : t.pullToRefresh}
            </span>
          </div>
        )}

        <div
          className={`${pullEnabled ? "wallet-pull-content" : ""} ${
            pullEnabled && active && !refreshing ? "wallet-pull-content--dragging" : ""
          }`.trim() || undefined}
          style={
            pullEnabled && active
              ? { transform: `translateY(${pull}px)` }
              : undefined
          }
        >
          {children}
        </div>
      </main>

      {!hideNav && <BottomNav />}
      <InstallBottomBanner aboveNav={!hideNav} />
    </div>
  );
}
