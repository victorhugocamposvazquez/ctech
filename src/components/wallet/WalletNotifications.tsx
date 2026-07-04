"use client";

import { useWalletNotificationUi } from "@/contexts/WalletNotificationContext";
import { t } from "@/lib/wallet/i18n";

export function WalletNotificationsBell() {
  const { unreadCount, openSheet } = useWalletNotificationUi();

  return (
    <button
      type="button"
      onClick={openSheet}
      className="wallet-icon-btn relative"
      aria-label={t.notifications}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-wallet-accent px-1 text-[10px] font-bold text-[#041018]">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
