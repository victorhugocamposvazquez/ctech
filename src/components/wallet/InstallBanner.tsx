"use client";

import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";
import { TrustShield } from "./TrustShield";

interface InstallBottomBannerProps {
  aboveNav?: boolean;
}

export function InstallBottomBanner({ aboveNav = true }: InstallBottomBannerProps) {
  const { showInstallBanner, canNativeInstall, isIOS, isPrompting, install, dismiss } =
    useInstallPrompt();

  const positionClass = aboveNav ? "bottom-[72px]" : "bottom-3 safe-bottom";

  if (isPrompting) {
    return (
      <div className={`fixed left-0 right-0 z-[60] mx-auto max-w-lg px-4 ${positionClass}`}>
        <div className="wallet-install-banner flex items-center justify-center gap-3 px-5 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-wallet-accent border-t-transparent" />
          <span className="text-sm font-medium text-wallet-text">Installing…</span>
        </div>
      </div>
    );
  }

  if (!showInstallBanner) return null;

  return (
    <div
      className={`fixed left-0 right-0 z-[60] mx-auto max-w-lg px-4 ${positionClass}`}
      role="region"
      aria-label="Install app"
    >
      <div className="wallet-install-banner flex items-center gap-3 px-4 py-3.5">
        <TrustShield className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-wallet-text">
            Install Trust Wallet
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-wallet-muted">
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
            onClick={() => void install()}
            className="shrink-0 rounded-full bg-wallet-accent px-4 py-2 text-xs font-bold text-[#060608]"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="wallet-icon-btn !h-8 !w-8 shrink-0 text-wallet-muted"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/** @deprecated Use InstallBottomBanner in WalletShell */
export function InstallBanner() {
  return null;
}
