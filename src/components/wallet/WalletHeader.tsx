"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocalWallet } from "@/contexts/LocalWalletContext";
import { shortenAddress } from "@/lib/wallet/format";
import { walletChain } from "@/lib/wallet/config";
import { isSubpage, routeTitle, t } from "@/lib/wallet/i18n";
import { WalletPickerSheet } from "./WalletPickerSheet";
import { WalletNotificationsBell } from "./WalletNotifications";

interface WalletHeaderProps {
  address?: string;
  showWalletSelector?: boolean;
}

export function WalletHeader({
  address,
  showWalletSelector = true,
}: WalletHeaderProps) {
  const pathname = usePathname();
  const isHome = pathname === "/wallet";
  const sub = isSubpage(pathname);
  const title = routeTitle(pathname);
  const { wallets, activeWalletId, switchWallet, startAddingWallet, lock } =
    useLocalWallet();
  const [showPicker, setShowPicker] = useState(false);

  const activeMeta = wallets.find((w) => w.id === activeWalletId);
  const hasMultiple = wallets.length > 1;
  const displayAddress = activeMeta?.address ?? address;
  const addressPreview = displayAddress ? shortenAddress(displayAddress, 6) : null;

  const handleSelect = (id: string) => {
    setShowPicker(false);
    if (id !== activeWalletId) {
      switchWallet(id);
    }
  };

  const handleAdd = () => {
    setShowPicker(false);
    lock();
    startAddingWallet();
  };

  return (
    <>
      <header
        className={`wallet-app-header ${
          isHome && showWalletSelector ? "wallet-app-header--home" : ""
        }`.trim()}
      >
        {isHome && showWalletSelector ? (
          hasMultiple ? (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="wallet-network-pill wallet-network-pill--home"
            >
              <span className="h-2.5 w-2.5 shrink-0 self-center rounded-full bg-wallet-accent shadow-[0_0_8px_var(--wallet-accent-glow)]" />
              <span className="wallet-pill-content min-w-0 flex-1">
                <span className="wallet-pill-label truncate">
                  {activeMeta?.label ?? t.walletLabel}
                </span>
                {addressPreview && (
                  <span className="wallet-pill-address truncate">{addressPreview}</span>
                )}
              </span>
              <svg className="h-4 w-4 shrink-0 self-center opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <span className="wallet-network-pill wallet-network-pill--home">
              <span className="h-2.5 w-2.5 shrink-0 self-center rounded-full bg-wallet-accent shadow-[0_0_8px_var(--wallet-accent-glow)]" />
              <span className="wallet-pill-content min-w-0 flex-1">
                <span className="wallet-pill-label truncate">{walletChain.name}</span>
                {addressPreview && (
                  <span className="wallet-pill-address truncate">{addressPreview}</span>
                )}
              </span>
            </span>
          )
        ) : (
          <>
            {sub ? (
              <Link href="/wallet" className="wallet-icon-btn" aria-label={t.back}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            ) : (
              <span className="wallet-icon-btn pointer-events-none opacity-0" aria-hidden="true" />
            )}

            <span className="text-[17px] font-semibold tracking-tight text-wallet-text">
              {title}
            </span>
          </>
        )}

        <div className="wallet-app-header-actions">
          <WalletNotificationsBell />
          {address && (
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(address)}
              className="wallet-icon-btn"
              aria-label={t.copyAddressShort}
              title={shortenAddress(address, 4)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          <Link href="/wallet/receive" className="wallet-icon-btn" aria-label={t.receive}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0 11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </Link>
        </div>
      </header>

      <WalletPickerSheet
        open={showPicker}
        wallets={wallets}
        activeId={activeWalletId}
        onSelect={handleSelect}
        onAdd={handleAdd}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
}
