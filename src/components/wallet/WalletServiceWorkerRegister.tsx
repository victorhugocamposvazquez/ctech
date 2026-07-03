"use client";

import { useEffect } from "react";
import { registerWalletServiceWorker } from "@/lib/wallet/pwa-ios";

/** Registra el service worker de la wallet (requerido para instalación PWA en iOS). */
export function WalletServiceWorkerRegister() {
  useEffect(() => {
    void registerWalletServiceWorker();
  }, []);
  return null;
}
