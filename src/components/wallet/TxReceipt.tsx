"use client";

import { txExplorerUrl } from "@/lib/wallet/explorer";
import { t } from "@/lib/wallet/i18n";

export function TxReceipt({
  hash,
  onReset,
}: {
  hash: string;
  onReset?: () => void;
}) {
  return (
    <div className="wallet-empty py-10">
      <div className="wallet-empty-icon text-wallet-accent">
        <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-xl font-bold text-wallet-text">{t.sendSuccess}</p>
      <p className="mt-2 break-all font-mono text-xs text-wallet-muted">
        {hash.slice(0, 14)}…{hash.slice(-10)}
      </p>
      <a
        href={txExplorerUrl(hash)}
        target="_blank"
        rel="noopener noreferrer"
        className="wallet-btn-primary mt-6 max-w-xs"
      >
        {t.viewExplorer}
      </a>
      {onReset && (
        <button type="button" onClick={onReset} className="mt-3 text-sm font-semibold text-wallet-accent">
          {t.sendAnother}
        </button>
      )}
    </div>
  );
}
