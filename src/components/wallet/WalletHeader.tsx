"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { shortenAddress } from "@/lib/wallet/format";
import { walletChain } from "@/lib/wallet/config";
import { isSubpage, routeTitle, t } from "@/lib/wallet/i18n";

interface WalletHeaderProps {
  address?: string;
  showWalletSelector?: boolean;
}

export function WalletHeader({
  address,
  showWalletSelector = true,
}: WalletHeaderProps) {
  const pathname = usePathname();
  const sub = isSubpage(pathname);
  const title = routeTitle(pathname);

  return (
    <header className="safe-top flex items-center justify-between px-5 pb-3 pt-4">
      {sub ? (
        <Link href="/wallet" className="wallet-icon-btn" aria-label={t.back}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      ) : (
        <Link href="/wallet/settings" className="wallet-icon-btn" aria-label={t.navSettings}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Link>
      )}

      {showWalletSelector && !sub ? (
        <span className="wallet-network-pill">
          <span className="h-2 w-2 rounded-full bg-wallet-accent shadow-[0_0_8px_var(--wallet-accent-glow)]" />
          {walletChain.name}
        </span>
      ) : (
        <span className="text-[17px] font-semibold tracking-tight text-wallet-text">
          {title}
        </span>
      )}

      <div className="flex items-center gap-0.5">
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
