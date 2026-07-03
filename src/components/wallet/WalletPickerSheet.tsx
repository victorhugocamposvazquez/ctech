"use client";

import { shortenAddress } from "@/lib/wallet/format";
import { t } from "@/lib/wallet/i18n";
import type { WalletMeta } from "@/lib/wallet/keystore";

interface WalletPickerSheetProps {
  open: boolean;
  wallets: WalletMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onClose: () => void;
}

export function WalletPickerSheet({
  open,
  wallets,
  activeId,
  onSelect,
  onAdd,
  onClose,
}: WalletPickerSheetProps) {
  if (!open) return null;

  return (
    <div className="wallet-overlay" role="dialog" aria-modal="true">
      <button type="button" className="wallet-overlay-backdrop" onClick={onClose} aria-label={t.close} />
      <div className="wallet-sheet">
        <div className="wallet-sheet-handle" />
        <h2 className="text-lg font-bold text-wallet-text">{t.selectWallet}</h2>
        <p className="mt-1 text-sm text-wallet-muted">{t.selectWalletHint}</p>

        <ul className="mt-5 max-h-[50vh] space-y-2 overflow-y-auto">
          {wallets.map((w) => {
            const active = w.id === activeId;
            return (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => onSelect(w.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                    active
                      ? "border-wallet-accent bg-wallet-accent/10"
                      : "border-wallet-border bg-wallet-card hover:border-wallet-accent/40"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      active ? "bg-wallet-accent text-white" : "bg-wallet-border text-wallet-muted"
                    }`}
                  >
                    {w.label.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-wallet-text">
                      {w.label}
                    </span>
                    <span className="block truncate font-mono text-xs text-wallet-muted">
                      {shortenAddress(w.address, 6)}
                    </span>
                  </span>
                  {active && (
                    <svg className="h-5 w-5 shrink-0 text-wallet-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <button type="button" onClick={onAdd} className="wallet-btn-secondary mt-4">
          {t.addWallet}
        </button>
      </div>
    </div>
  );
}
