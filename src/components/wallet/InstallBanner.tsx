"use client";

import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";

export function InstallBanner() {
  const { canInstall, install, dismiss, isStandalone } = useInstallPrompt();

  if (isStandalone || !canInstall) return null;

  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-wallet-accent/30 bg-wallet-accent/10 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wallet-accent/20 text-wallet-accent">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-wallet-text">Instalar app</p>
        <p className="text-xs text-wallet-muted">
          Añádela a tu pantalla de inicio como Trust Wallet
        </p>
      </div>
      <button
        type="button"
        onClick={() => void install()}
        className="shrink-0 rounded-xl bg-wallet-accent px-3 py-2 text-xs font-bold text-white"
      >
        Instalar
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 p-1 text-wallet-muted hover:text-wallet-text"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}
