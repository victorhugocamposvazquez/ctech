"use client";

import { useState } from "react";
import { t } from "@/lib/wallet/i18n";

export function TxReceipt({
  hash,
  onReset,
}: {
  hash: string;
  onReset?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      <button type="button" onClick={() => void copy()} className="wallet-btn-primary mt-6 max-w-xs">
        {copied ? t.copied : t.copyHash}
      </button>
      {onReset && (
        <button type="button" onClick={onReset} className="mt-3 text-sm font-semibold text-wallet-accent">
          {t.sendAnother}
        </button>
      )}
    </div>
  );
}
