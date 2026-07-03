"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { shortenAddress } from "@/lib/wallet/format";

interface WalletHeaderProps {
  address?: string;
  showWalletSelector?: boolean;
}

export function WalletHeader({
  address,
  showWalletSelector = true,
}: WalletHeaderProps) {
  const pathname = usePathname();
  const isSettings = pathname.startsWith("/wallet/settings");

  return (
    <header className="safe-top flex items-center justify-between px-4 pb-2 pt-3">
      <Link
        href="/wallet/settings"
        className="flex h-10 w-10 items-center justify-center rounded-full text-wallet-text transition hover:bg-wallet-elevated"
        aria-label="Ajustes"
      >
        {isSettings ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </Link>

      {showWalletSelector && (
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[15px] font-semibold text-wallet-text transition hover:bg-wallet-elevated"
        >
          <span>Main Wallet</span>
          <svg className="h-4 w-4 text-wallet-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {!showWalletSelector && (
        <span className="text-[17px] font-semibold text-wallet-text">
          {pathname.includes("/send")
            ? "Enviar"
            : pathname.includes("/receive")
              ? "Recibir"
              : "Trust Wallet"}
        </span>
      )}

      <div className="flex items-center gap-1">
        {address && (
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(address)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-wallet-text transition hover:bg-wallet-elevated"
            aria-label="Copiar dirección"
            title={shortenAddress(address, 4)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}
        <Link
          href="/wallet/receive"
          className="flex h-10 w-10 items-center justify-center rounded-full text-wallet-text transition hover:bg-wallet-elevated"
          aria-label="Escanear QR"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
