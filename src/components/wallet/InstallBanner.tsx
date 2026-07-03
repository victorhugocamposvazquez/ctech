"use client";

import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";
import { TrustShield } from "./TrustShield";

interface InstallBottomBannerProps {
  aboveNav?: boolean;
}

export function InstallBottomBanner({ aboveNav = true }: InstallBottomBannerProps) {
  const { showInstallBanner, canNativeInstall, isIOS, install, dismiss } =
    useInstallPrompt();

  if (!showInstallBanner) return null;

  const positionClass = aboveNav ? "bottom-[72px]" : "bottom-3 safe-bottom";

  const hint = isIOS
    ? "Ver instrucciones para añadir a pantalla de inicio"
    : canNativeInstall
      ? "Añádela a tu pantalla de inicio con un toque"
      : "Toca Instalar para ver cómo añadirla";

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
          <p className="mt-0.5 text-[11px] leading-snug text-wallet-muted">{hint}</p>
        </div>
        <button
          type="button"
          onClick={install}
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
