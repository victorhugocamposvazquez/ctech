"use client";

import { useLocalWallet } from "@/contexts/LocalWalletContext";
import { shortenAddress } from "@/lib/wallet/format";
import { t } from "@/lib/wallet/i18n";

export function WalletsSettings() {
  const {
    wallets,
    activeWalletId,
    switchWallet,
    startAddingWallet,
    removeWallet,
    lock,
  } = useLocalWallet();

  if (wallets.length === 0) return null;

  const handleSwitch = (id: string) => {
    if (id === activeWalletId) return;
    switchWallet(id);
  };

  const handleRemove = (id: string, label: string) => {
    if (!confirm(`${t.deleteActiveConfirm}\n\n${label}`)) return;
    removeWallet(id);
  };

  return (
    <section className="wallet-settings-group">
      <div className="wallet-settings-row">
        <div className="flex items-center justify-between gap-3">
          <p className="wallet-settings-label">{t.manageWallets}</p>
          <button
            type="button"
            onClick={() => {
              lock();
              startAddingWallet();
            }}
            className="text-sm font-semibold text-wallet-accent"
          >
            {t.addWallet}
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {wallets.map((w) => {
            const active = w.id === activeWalletId;
            return (
              <li
                key={w.id}
                className={`rounded-xl border px-3 py-3 ${
                  active ? "border-wallet-accent/50 bg-wallet-accent/5" : "border-wallet-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleSwitch(w.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[15px] font-semibold text-wallet-text">
                      {w.label}
                      {active && (
                        <span className="ml-2 text-xs font-medium text-wallet-accent">
                          · {t.activeWallet}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-wallet-muted">
                      {shortenAddress(w.address, 10)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(w.id, w.label)}
                    className="shrink-0 text-xs font-semibold text-wallet-danger"
                  >
                    {t.removeWallet}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
