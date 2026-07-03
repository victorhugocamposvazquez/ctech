"use client";

import { useAccount, useDisconnect } from "wagmi";
import { useLocalWallet } from "@/contexts/LocalWalletContext";

export type WalletMode = "local" | "external" | null;

export function useWalletSession() {
  const { status: localStatus, address: localAddress, lock, removeWallet } =
    useLocalWallet();
  const { address: externalAddress, isConnected: externalConnected } =
    useAccount();
  const { disconnect } = useDisconnect();

  const mode: WalletMode = externalConnected
    ? "external"
    : localStatus === "unlocked"
      ? "local"
      : null;

  const address =
    mode === "external"
      ? externalAddress
      : mode === "local"
        ? localAddress
        : undefined;

  const isConnected = mode !== null && !!address;

  const disconnectAll = () => {
    if (externalConnected) disconnect();
    if (localStatus === "unlocked") lock();
  };

  const deleteLocalWallet = () => {
    removeWallet();
  };

  return {
    mode,
    address,
    isConnected,
    localStatus,
    externalConnected,
    disconnectAll,
    deleteLocalWallet,
    needsOnboarding:
      localStatus === "none" && !externalConnected,
    needsUnlock: localStatus === "locked" && !externalConnected,
  };
}
