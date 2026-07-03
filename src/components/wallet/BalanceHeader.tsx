"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/wallet/format";
import { t } from "@/lib/wallet/i18n";

interface BalanceHeaderProps {
  totalUsd: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function BalanceHeader({ totalUsd, isLoading, onRefresh }: BalanceHeaderProps) {
  const [hidden, setHidden] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const refresh = () => {
    if (!onRefresh) return;
    setSpinning(true);
    onRefresh();
    window.setTimeout(() => setSpinning(false), 800);
  };

  return (
    <div className="px-5 pb-4 pt-2 text-center">
      <div className="flex items-center justify-center gap-2">
        <p className="wallet-balance-label">{t.totalBalance}</p>
        {onRefresh && (
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            className="wallet-icon-btn !h-7 !w-7 text-wallet-muted"
            aria-label={t.refresh}
          >
            <svg
              className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => setHidden((v) => !v)}
          className="wallet-icon-btn !h-7 !w-7 text-wallet-muted"
          aria-label={hidden ? "Mostrar balance" : "Ocultar balance"}
        >
          {hidden ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>

      <div className="mt-3 flex min-h-[56px] items-center justify-center">
        {isLoading ? (
          <div className="wallet-skeleton h-12 w-52 rounded-2xl" />
        ) : (
          <h1 className="wallet-balance-amount">
            {hidden ? "••••••" : formatUsd(totalUsd)}
          </h1>
        )}
      </div>
    </div>
  );
}
