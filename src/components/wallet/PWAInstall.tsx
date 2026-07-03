"use client";

import {
  forwardRef,
  useEffect,
  type Ref,
} from "react";
import type { PWAInstallElement } from "@khmyznikov/pwa-install";

interface PWAInstallProps {
  onInstallSuccess?: () => void;
}

export const PWAInstall = forwardRef<PWAInstallElement, PWAInstallProps>(
  function PWAInstall({ onInstallSuccess }, ref) {
    useEffect(() => {
      void import("@khmyznikov/pwa-install");
    }, []);

    useEffect(() => {
      const attach = (el: PWAInstallElement | null) => {
        if (!el || !onInstallSuccess) return undefined;
        const handler = () => onInstallSuccess();
        el.addEventListener("pwa-install-success-event", handler);
        return () => el.removeEventListener("pwa-install-success-event", handler);
      };

      const el =
        ref && typeof ref === "object" && "current" in ref ? ref.current : null;
      let cleanup = attach(el);

      const timer = window.setTimeout(() => {
        cleanup?.();
        const late =
          ref && typeof ref === "object" && "current" in ref ? ref.current : null;
        cleanup = attach(late);
      }, 0);

      return () => {
        window.clearTimeout(timer);
        cleanup?.();
      };
    }, [onInstallSuccess, ref]);

    return (
      <pwa-install
        ref={ref as Ref<PWAInstallElement>}
        manual-apple="true"
        manual-chrome="true"
        manifest-url="/manifest.webmanifest"
        install-description="Instala la app para acceder más rápido a tu wallet"
      />
    );
  }
);
