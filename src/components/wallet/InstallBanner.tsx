"use client";

import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";

export function InstallBanner() {
  const { canInstall, install, dismiss, isStandalone } = useInstallPrompt();

  if (isStandalone || !canInstall) return null;

  return (
    <div className="mx-4 mb-2 flex items-center gap-3 rounded-2xl border border-wallet-accent/20 bg-wallet-accent/10 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wallet-accent/20">
        <svg className="h-4 w-4 text-wallet-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-wallet-text">Install Trust Wallet</p>
        <p className="text-xs text-wallet-muted">Add to home screen</p>
      </div>
      <button
        type="button"
        onClick={() => void install()}
        className="shrink-0 rounded-full bg-wallet-accent px-4 py-2 text-xs font-bold text-[#0b0b0c]"
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 p-1 text-lg leading-none text-wallet-muted"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
