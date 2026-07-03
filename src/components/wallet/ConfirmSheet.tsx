"use client";

import { t } from "@/lib/wallet/i18n";

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  rows: { label: string; value: string; mono?: boolean }[];
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  open,
  title,
  rows,
  busy,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  if (!open) return null;

  return (
    <div className="wallet-overlay" role="dialog" aria-modal="true">
      <button type="button" className="wallet-overlay-backdrop" onClick={onCancel} aria-label={t.cancel} />
      <div className="wallet-sheet">
        <div className="wallet-sheet-handle" />
        <h2 className="text-lg font-bold text-wallet-text">{title}</h2>
        <dl className="mt-5 space-y-3">
          {rows.map(({ label, value, mono }) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <dt className="text-sm text-wallet-muted">{label}</dt>
              <dd
                className={`max-w-[60%] text-right text-sm font-semibold text-wallet-text ${mono ? "break-all font-mono text-xs" : ""}`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="wallet-btn-primary"
          >
            {busy ? t.confirming : t.confirmSend}
          </button>
          <button type="button" onClick={onCancel} className="wallet-btn-secondary">
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
