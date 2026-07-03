"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/wallet/format";

interface BalanceHeaderProps {
  totalUsd: number;
  isLoading?: boolean;
}

export function BalanceHeader({ totalUsd, isLoading }: BalanceHeaderProps) {
  const [hidden, setHidden] = useState(false);

  return (
    <div className="px-4 pb-2 pt-1 text-center">
      <div className="flex items-center justify-center gap-2">
        <p className="text-sm font-medium text-wallet-muted">Total balance</p>
        <button
          type="button"
          onClick={() => setHidden((v) => !v)}
          className="text-wallet-muted transition hover:text-wallet-text"
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

      <div className="mt-2 flex min-h-[52px] items-center justify-center">
        {isLoading ? (
          <div className="h-11 w-56 animate-pulse rounded-xl bg-wallet-elevated" />
        ) : (
          <h1 className="text-[40px] font-bold leading-none tracking-tight text-wallet-text">
            {hidden ? "••••••" : formatUsd(totalUsd)}
          </h1>
        )}
      </div>
    </div>
  );
}
