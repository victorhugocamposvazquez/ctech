"use client";

import { useWalletSession } from "@/hooks/wallet/useWalletSession";
import { useAutoLock } from "@/hooks/wallet/useAutoLock";

/** Activa auto-lock cuando hay wallet local desbloqueada. */
export function AutoLockGuard() {
  const { mode } = useWalletSession();
  useAutoLock(mode === "local");
  return null;
}
