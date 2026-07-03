"use client";

import { useState } from "react";
import { shortenAddress } from "@/lib/wallet/format";
import { t } from "@/lib/wallet/i18n";
import type { StoredTx } from "@/lib/wallet/tx-history";

export function TxDetailSheet({
  tx,
  onClose,
}: {
  tx: StoredTx | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!tx) return null;

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="wallet-overlay" role="dialog" aria-modal="true">
      <button type="button" className="wallet-overlay-backdrop" onClick={onClose} aria-label={t.cancel} />
      <div className="wallet-sheet">
        <div className="wallet-sheet-handle" />
        <h2 className="text-lg font-bold text-wallet-text">{t.txDetail}</h2>
        <dl className="mt-5 space-y-4">
          <div>
            <dt className="wallet-settings-label">{t.amount}</dt>
            <dd className="mt-1 font-semibold text-wallet-text">
              − {tx.amount} {tx.symbol}
            </dd>
          </div>
          <div>
            <dt className="wallet-settings-label">{t.toAddress}</dt>
            <dd className="mt-1 break-all font-mono text-xs text-wallet-secondary">{tx.to}</dd>
            <button
              type="button"
              onClick={() => void copy("to", tx.to)}
              className="mt-2 text-xs font-semibold text-wallet-accent"
            >
              {copied === "to" ? t.copied : t.copyAddress}
            </button>
          </div>
          <div>
            <dt className="wallet-settings-label">Hash</dt>
            <dd className="mt-1 break-all font-mono text-xs text-wallet-secondary">{tx.hash}</dd>
            <button
              type="button"
              onClick={() => void copy("hash", tx.hash)}
              className="mt-2 text-xs font-semibold text-wallet-accent"
            >
              {copied === "hash" ? t.copied : t.copyHash}
            </button>
          </div>
        </dl>
        <button type="button" onClick={onClose} className="wallet-btn-secondary mt-6">
          {t.close}
        </button>
      </div>
    </div>
  );
}
