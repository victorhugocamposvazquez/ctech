import type { Address } from "viem";
import { scheduleWalletSnapshotPush } from "./pwa-sync";

export interface StoredTx {
  hash: string;
  from: Address;
  to: Address;
  symbol: string;
  amount: string;
  timestamp: number;
  direction: "out";
}

const KEY = "wallet_tx_history_v1";
const MAX = 20;

export function loadTxHistory(address?: string): StoredTx[] {
  if (typeof window === "undefined" || !address) return [];
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "[]") as StoredTx[];
    return all
      .filter((tx) => tx.from.toLowerCase() === address.toLowerCase())
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function saveTx(tx: StoredTx): void {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "[]") as StoredTx[];
    const next = [tx, ...all.filter((t) => t.hash !== tx.hash)].slice(0, MAX * 3);
    localStorage.setItem(KEY, JSON.stringify(next));
    scheduleWalletSnapshotPush();
  } catch {
    /* ignore */
  }
}
