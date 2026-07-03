"use client";

import { useState } from "react";
import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";
import { TrustShield } from "./TrustShield";

interface InstallBottomBannerProps {
  /** Si hay bottom nav, el banner queda encima */
  aboveNav?: boolean;
}

export function InstallBottomBanner({ aboveNav = true }: InstallBottomBannerProps) {
  const { showInstallBanner, canNativeInstall, isIOS, install, dismiss } =
    useInstallPrompt();
  const [showIosHint, setShowIosHint] = useState(false);

  if (!showInstallBanner) return null;

  const handleInstall = () => {
    if (canNativeInstall) {
      void install();
      return;
    }
    if (isIOS) {
      setShowIosHint(true);
    }
  };

  return (
    <>
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
                ? "Add to your home screen"
                : isIOS
                  ? "Tap Install for instructions"
                  : "Use Chrome to install the app"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            className="shrink-0 rounded-full bg-wallet-accent px-4 py-2 text-xs font-bold text-[#0b0b0c]"
          >
            Install
          </button>
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

      {showIosHint && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowIosHint(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="mb-8 w-full max-w-sm rounded-2xl bg-wallet-elevated p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-bold text-wallet-text">Install on iOS</p>
            <ol className="mt-4 space-y-3 text-sm text-wallet-secondary">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-wallet-accent text-xs font-bold text-[#0b0b0c]">
                  1
                </span>
                Tap the <strong>Share</strong> button in Safari
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-wallet-accent text-xs font-bold text-[#0b0b0c]">
                  2
                </span>
                Scroll and tap <strong>Add to Home Screen</strong>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-wallet-accent text-xs font-bold text-[#0b0b0c]">
                  3
                </span>
                Tap <strong>Add</strong> to confirm
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIosHint(false)}
              className="wallet-btn-primary mt-6"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** @deprecated Usar InstallBottomBanner en WalletShell */
export function InstallBanner() {
  return null;
}
