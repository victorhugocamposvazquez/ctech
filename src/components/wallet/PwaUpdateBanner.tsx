"use client";

import { useState } from "react";
import { usePwaUpdate } from "@/hooks/wallet/usePwaUpdate";
import { t } from "@/lib/wallet/i18n";

export function PwaUpdateBanner() {
  const { updateAvailable, applyUpdate } = usePwaUpdate();
  const [refreshing, setRefreshing] = useState(false);

  if (!updateAvailable) return null;

  const handleUpdate = () => {
    setRefreshing(true);
    applyUpdate();
  };

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[900] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      role="region"
      aria-live="polite"
      aria-label={t.pwaUpdateTitle}
    >
      <div className="wallet-update-banner mx-3 flex items-center gap-3 px-3 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wallet-accent/15">
          <svg
            className="h-5 w-5 text-wallet-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-wallet-text">
            {t.pwaUpdateTitle}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-wallet-muted">
            {t.pwaUpdateHint}
          </p>
        </div>
        <button
          type="button"
          disabled={refreshing}
          onClick={handleUpdate}
          className="shrink-0 rounded-full bg-wallet-accent px-4 py-2 text-xs font-bold text-[#060608] disabled:opacity-70"
        >
          {refreshing ? t.pwaUpdateRefreshing : t.pwaUpdateAction}
        </button>
      </div>
    </div>
  );
}
