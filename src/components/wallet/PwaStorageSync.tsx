"use client";

import { useEffect, useState } from "react";
import {
  migrateFromBrowserBridge,
  pushWalletSnapshot,
  scheduleWalletSnapshotPush,
  shouldUseStorageBridge,
  WALLET_SYNC_APPLIED_EVENT,
} from "@/lib/wallet/pwa-sync";
import { isStandalonePwa } from "@/lib/wallet/pwa-ios";
import { t } from "@/lib/wallet/i18n";

/** Sincroniza localStorage Safari ↔ PWA vía service worker (iOS). */
export function PwaStorageSync() {
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!shouldUseStorageBridge()) return;

    let cancelled = false;

    const onSyncApplied = () => {
      if (!cancelled) {
        setToast(true);
        setTimeout(() => setToast(false), 3500);
      }
    };

    window.addEventListener(WALLET_SYNC_APPLIED_EVENT, onSyncApplied);

    void (async () => {
      if (isStandalonePwa()) {
        await migrateFromBrowserBridge();
      } else {
        await pushWalletSnapshot();
      }
    })();

    const onHide = () => {
      if (!isStandalonePwa()) void pushWalletSnapshot();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    // Re-push periódico en Safari por si el usuario va a instalar
    const interval = window.setInterval(() => {
      if (!isStandalonePwa()) scheduleWalletSnapshotPush();
    }, 30_000);

    return () => {
      cancelled = true;
      window.removeEventListener(WALLET_SYNC_APPLIED_EVENT, onSyncApplied);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      clearInterval(interval);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      className="fixed left-4 right-4 top-4 z-[300] mx-auto max-w-lg rounded-2xl border border-wallet-accent/30 bg-wallet-card px-4 py-3 text-center text-sm font-medium text-wallet-text shadow-lg safe-top"
      role="status"
    >
      {t.pwaSyncSuccess}
      <span className="mt-1 block text-xs font-normal text-wallet-muted">{t.pwaSyncBioHint}</span>
    </div>
  );
}
