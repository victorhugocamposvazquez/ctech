"use client";

import { forwardRef, useCallback, useEffect, useRef } from "react";
import type { PWAInstallElement } from "@khmyznikov/pwa-install";

interface PWAInstallProps {
  onReady?: () => void;
  onInstallAvailable?: () => void;
  onInstallSuccess?: () => void;
}

export const PWAInstall = forwardRef<PWAInstallElement, PWAInstallProps>(
  function PWAInstall(
    { onReady, onInstallAvailable, onInstallSuccess },
    forwardedRef
  ) {
    const handlersRef = useRef({ onReady, onInstallAvailable, onInstallSuccess });
    handlersRef.current = { onReady, onInstallAvailable, onInstallSuccess };
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
      let cancelled = false;
      void import("@khmyznikov/pwa-install")
        .then(() => customElements.whenDefined("pwa-install"))
        .then(() => {
          if (!cancelled) handlersRef.current.onReady?.();
        });
      return () => {
        cancelled = true;
      };
    }, []);

    const setRef = useCallback(
      (el: PWAInstallElement | null) => {
        cleanupRef.current?.();
        cleanupRef.current = null;

        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;

        if (!el) return;

        const onSuccess = () => handlersRef.current.onInstallSuccess?.();
        const onAvailable = () => handlersRef.current.onInstallAvailable?.();
        el.addEventListener("pwa-install-success-event", onSuccess);
        el.addEventListener("pwa-install-available-event", onAvailable);
        cleanupRef.current = () => {
          el.removeEventListener("pwa-install-success-event", onSuccess);
          el.removeEventListener("pwa-install-available-event", onAvailable);
        };
      },
      [forwardedRef]
    );

    return (
      <pwa-install
        ref={setRef}
        manual-apple="true"
        disable-chrome="true"
        manifest-url="/manifest.webmanifest"
        name="Trust Wallet"
        description="Tu wallet crypto segura en BNB Smart Chain"
        icon="/wallet/icons/icon-180.png"
        install-description="Instala la app para acceder más rápido a tu wallet"
      />
    );
  }
);
