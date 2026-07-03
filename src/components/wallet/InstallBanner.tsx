"use client";

import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";
import { TrustShield } from "./TrustShield";

interface InstallBottomBannerProps {
  aboveNav?: boolean;
}

export function InstallBottomBanner({ aboveNav = true }: InstallBottomBannerProps) {
  const { showInstallBanner, isIOS, install, dismiss } = useInstallPrompt();

  const positionClass = aboveNav ? "bottom-[72px]" : "bottom-3 safe-bottom";

  if (!showInstallBanner) return null;

  return (
    <div
      className={`fixed left-0 right-0 z-[60] mx-auto max-w-lg px-4 ${positionClass}`}
      role="region"
      aria-label="Instalar aplicación"
    >
      <div className="wallet-install-banner flex items-center gap-3 px-4 py-3.5">
        <TrustShield className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-wallet-text">
            Instalar Trust Wallet
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-wallet-muted">
            {isIOS
              ? "Toca Instalar para ver los pasos en Safari"
              : "Añádela a tu pantalla de inicio con un toque"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void install()}
          className="shrink-0 rounded-full bg-wallet-accent px-4 py-2 text-xs font-bold text-[#060608]"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="wallet-icon-btn !h-8 !w-8 shrink-0 text-wallet-muted"
          aria-label="Cerrar"
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
