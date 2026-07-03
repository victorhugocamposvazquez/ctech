"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLocalWallet } from "@/contexts/LocalWalletContext";

const DEFAULT_MS = 5 * 60 * 1000;
const STORAGE_KEY = "wallet_autolock_ms";

export function getAutoLockMs(): number {
  if (typeof window === "undefined") return DEFAULT_MS;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "0") return 0;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MS;
}

export function setAutoLockMs(ms: number): void {
  localStorage.setItem(STORAGE_KEY, String(ms));
}

const EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

/** Bloquea la wallet local tras inactividad. */
export function useAutoLock(enabled: boolean) {
  const { status, lock } = useLocalWallet();
  const timerRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const ms = getAutoLockMs();
    if (!enabled || status !== "unlocked" || ms === 0) return;
    timerRef.current = window.setTimeout(() => lock(), ms);
  }, [enabled, status, lock]);

  useEffect(() => {
    if (!enabled || status !== "unlocked" || getAutoLockMs() === 0) return;

    reset();
    for (const ev of EVENTS) {
      window.addEventListener(ev, reset, { passive: true });
    }
    const onVis = () => {
      if (document.visibilityState === "visible") reset();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      for (const ev of EVENTS) {
        window.removeEventListener(ev, reset);
      }
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, status, reset]);
}
