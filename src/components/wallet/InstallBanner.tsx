"use client";

import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";
import { TrustShield } from "./TrustShield";

interface InstallBottomBannerProps {
  aboveNav?: boolean;
}

export function InstallBottomBanner({ aboveNav = true }: InstallBottomBannerProps) {
  const { showInstallBanner, canNativeInstall, isIOS, isPrompting, install, dismiss } =
    useInstallPrompt();

  if (isPrompting) {
    return (
      <div
        className={`fixed left-0 right-0 z-[60] mx-auto max-w-lg px-3 ${
          aboveNav ? "bottom-[72px]" : "bottom-3 safe-bottom"
        }`}
      >
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-wallet-elevated/95 px-4 py-3 backdrop-blur-md">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-wallet-accent border-t-transparent" />
          <span className="text-sm text-wallet-text">Installing…</span>
        </div>
      </div>
    );
  }

  if (!showInstallBanner) return null;

  const handleInstall = () => {
    if (canNativeInstall) {
      void install();
    }
  };

  return (
    <div
      className={`fixed left-0 right-0 z-[60] mx-auto max-w-lg px-3 ${
        aboveNav ? "bottom-[72px]" : "bottom-3 safe-bottom"
      }`}
      role="region"
      aria-label="Instalar aplicación"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-wallet-accent/25 bg-wallet-elevated/95 px-3 py-3 shadow-2xl shadow-black/40 backdrop-blur-md">
        <TrustShield className="h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-wallet-text">
            Install Trust Wallet
          </p>
          <p className="text-[11px] leading-snug text-wallet-muted">
            {canNativeInstall
              ? "Tap Install to add the app"
              : isIOS
                ? "Safari: Share → Add to Home Screen"
                : "Open in Chrome to install automatically"}
          </p>
        </div>
        {canNativeInstall && (
          <button
            type="button"
            onClick={handleInstall}
            className="shrink-0 rounded-full bg-wallet-accent px-4 py-2 text-xs font-bold text-[#0b0b0c]"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-wallet-muted transition hover:bg-wallet-border hover:text-wallet-text"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/** @deprecated Usar InstallBottomBanner en WalletShell */
export function InstallBanner() {
  return null;
}
