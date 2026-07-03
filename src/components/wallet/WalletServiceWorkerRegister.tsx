"use client";

import { useEffect } from "react";
import { initPwaUpdateCheck } from "@/lib/wallet/pwa-update";

/** Inicializa el service worker y la detección de actualizaciones PWA. */
export function WalletServiceWorkerRegister() {
  useEffect(() => {
    void initPwaUpdateCheck();
  }, []);
  return null;
}
