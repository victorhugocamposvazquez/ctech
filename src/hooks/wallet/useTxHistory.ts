"use client";

import { useEffect, useMemo, useState } from "react";
import { useWalletSession } from "./useWalletSession";
import { loadTxHistory } from "@/lib/wallet/tx-history";

export function useTxHistory() {
  const { address } = useWalletSession();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener("wallet-tx-saved", bump);
    return () => window.removeEventListener("wallet-tx-saved", bump);
  }, []);

  return useMemo(() => loadTxHistory(address ?? undefined), [address, tick]);
}

export function notifyTxSaved(): void {
  window.dispatchEvent(new Event("wallet-tx-saved"));
}
