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

export function RecentTxList({
  txs,
  limit = 2,
}: {
  txs: StoredTx[];
  limit?: number;
}) {
  const [selected, setSelected] = useState<StoredTx | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (txs.length === 0) return null;

  const visible = expanded ? txs.slice(0, 5) : txs.slice(0, limit);
  const hasMore = txs.length > limit;

  return (
    <>
      <div className="wallet-recent-section">
        <div className="wallet-recent-header">
          <h2 className="wallet-recent-title">{t.recentActivity}</h2>
          {hasMore && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="wallet-recent-view-all"
            >
              {t.viewAllActivity}
            </button>
          )}
          {expanded && hasMore && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="wallet-recent-view-all"
            >
              {t.showLessActivity}
            </button>
          )}
        </div>
        <div className="wallet-settings-group">
          {visible.map((tx) => (
            <button
              key={tx.hash}
              type="button"
              onClick={() => setSelected(tx)}
              className="wallet-recent-row w-full text-left"
            >
              <div className="wallet-recent-row-icon" aria-hidden>
                <svg className="h-4 w-4 text-wallet-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="wallet-recent-row-amount">
                  − {tx.amount} {tx.symbol}
                </p>
                <p className="wallet-recent-row-meta truncate">
                  {t.sentTo} {shortenAddress(tx.to, 4)}
                </p>
              </div>
              <span className="wallet-recent-row-time">{formatWhen(tx.timestamp)}</span>
            </button>
          ))}
        </div>
      </div>
      <TxDetailSheet tx={selected} onClose={() => setSelected(null)} />
    </>
  );
}
