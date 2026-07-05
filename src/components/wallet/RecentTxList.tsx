"use client";

import { useState } from "react";
import { shortenAddress } from "@/lib/wallet/format";
import { t } from "@/lib/wallet/i18n";
import type { StoredTx } from "@/lib/wallet/tx-history";
import { TxDetailSheet } from "./TxDetailSheet";

function formatWhen(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function RecentTxList({ txs }: { txs: StoredTx[] }) {
  const [selected, setSelected] = useState<StoredTx | null>(null);

  if (txs.length === 0) return null;

  return (
    <>
      <div className="pb-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-wallet-muted">
          {t.recentActivity}
        </h2>
        <div className="wallet-settings-group">
          {txs.slice(0, 5).map((tx) => (
            <button
              key={tx.hash}
              type="button"
              onClick={() => setSelected(tx)}
              className="wallet-link-row w-full text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wallet-accent-soft">
                <svg className="h-5 w-5 text-wallet-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-wallet-text">
                  − {tx.amount} {tx.symbol}
                </p>
                <p className="text-xs text-wallet-muted">
                  {t.sentTo} {shortenAddress(tx.to, 6)}
                </p>
              </div>
              <span className="text-xs text-wallet-muted">{formatWhen(tx.timestamp)}</span>
            </button>
          ))}
        </div>
      </div>
      <TxDetailSheet tx={selected} onClose={() => setSelected(null)} />
    </>
  );
}
