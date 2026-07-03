"use client";

import { useAccount, useDisconnect } from "wagmi";
import { useLocalWallet } from "@/contexts/LocalWalletContext";

export type WalletMode = "local" | "external" | null;

export function useWalletSession() {
  const {
    status: localStatus,
    address: localAddress,
    lock,
    removeWallet,
    removeAllWallets,
    addingWallet,
    startAddingWallet,
    wallets,
  } = useLocalWallet();
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

  const deleteLocalWallet = (id?: string) => {
    removeWallet(id);
  };

  const deleteAllLocalWallets = () => {
    removeAllWallets();
  };

  return {
    mode,
    address,
    isConnected,
    localStatus,
    externalConnected,
    disconnectAll,
    deleteLocalWallet,
    deleteAllLocalWallets,
    startAddingWallet,
    addingWallet,
    wallets,
    needsOnboarding:
      localStatus === "none" && !externalConnected && !addingWallet,
    needsUnlock: localStatus === "locked" && !externalConnected && !addingWallet,
  };
}
