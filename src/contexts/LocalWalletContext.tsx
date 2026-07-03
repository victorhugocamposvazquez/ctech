"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createWalletClient,
  type Account,
  type Address,
  type Hash,
  type WalletClient,
} from "viem";
import { http } from "viem";
import { getWalletRpcUrl } from "@/lib/wallet/rpc";
import {
  english,
  generateMnemonic,
  mnemonicToAccount,
  privateKeyToAccount,
} from "viem/accounts";
import { walletChain } from "@/lib/wallet/config";
import {
  clearKeystore,
  decryptSecret,
  encryptSecret,
  hasKeystore,
  loadKeystore,
  saveKeystore,
  type SecretPayload,
} from "@/lib/wallet/keystore";

type LocalStatus = "loading" | "none" | "locked" | "unlocked";

interface LocalWalletContextValue {
  status: LocalStatus;
  account: Account | null;
  address: Address | null;
  createWallet: (password: string) => Promise<{ mnemonic: string; address: Address }>;
  importWallet: (payload: SecretPayload, password: string) => Promise<Address>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  removeWallet: () => void;
  getWalletClient: () => WalletClient | null;
  sendTransaction: (args: {
    to: Address;
    value?: bigint;
    data?: `0x${string}`;
  }) => Promise<Hash>;
}

const LocalWalletContext = createContext<LocalWalletContextValue | null>(null);

function accountFromSecret(payload: SecretPayload): Account {
  if (payload.type === "mnemonic") {
    return mnemonicToAccount(payload.value);
  }
  const key = payload.value.startsWith("0x")
    ? payload.value
    : (`0x${payload.value}` as `0x${string}`);
  return privateKeyToAccount(key as `0x${string}`);
}

export function LocalWalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LocalStatus>("loading");
  const [account, setAccount] = useState<Account | null>(null);
  const [secret, setSecret] = useState<SecretPayload | null>(null);

  useEffect(() => {
    setStatus(hasKeystore() ? "locked" : "none");
  }, []);

  const unlockWithSecret = useCallback((payload: SecretPayload) => {
    const acc = accountFromSecret(payload);
    setSecret(payload);
    setAccount(acc);
    setStatus("unlocked");
  }, []);

  const createWallet = useCallback(async (password: string) => {
    const mnemonic = generateMnemonic(english);
    const acc = mnemonicToAccount(mnemonic);
    const payload: SecretPayload = { type: "mnemonic", value: mnemonic };
    const store = await encryptSecret(payload, password, acc.address);
    saveKeystore(store);
    unlockWithSecret(payload);
    return { mnemonic, address: acc.address };
  }, [unlockWithSecret]);

  const importWallet = useCallback(
    async (payload: SecretPayload, password: string) => {
      const acc = accountFromSecret(payload);
      const store = await encryptSecret(payload, password, acc.address);
      saveKeystore(store);
      unlockWithSecret(payload);
      return acc.address;
    },
    [unlockWithSecret]
  );

  const unlock = useCallback(async (password: string) => {
    const store = loadKeystore();
    if (!store) throw new Error("No wallet found");
    const payload = await decryptSecret(store, password);
    unlockWithSecret(payload);
  }, [unlockWithSecret]);

  const lock = useCallback(() => {
    setAccount(null);
    setSecret(null);
    if (hasKeystore()) setStatus("locked");
    else setStatus("none");
  }, []);

  const removeWallet = useCallback(() => {
    clearKeystore();
    setAccount(null);
    setSecret(null);
    setStatus("none");
  }, []);

  const getWalletClient = useCallback(() => {
    if (!account) return null;
    return createWalletClient({
      account,
      chain: walletChain,
      transport: http(getWalletRpcUrl()),
    });
  }, [account]);

  const sendTransaction = useCallback(
    async (args: { to: Address; value?: bigint; data?: `0x${string}` }) => {
      const client = getWalletClient();
      if (!client) throw new Error("Wallet locked");
      return client.sendTransaction({
        to: args.to,
        value: args.value,
        data: args.data,
        chain: walletChain,
      });
    },
    [getWalletClient]
  );

  const value = useMemo(
    () => ({
      status,
      account,
      address: account?.address ?? null,
      createWallet,
      importWallet,
      unlock,
      lock,
      removeWallet,
      getWalletClient,
      sendTransaction,
    }),
    [
      status,
      account,
      createWallet,
      importWallet,
      unlock,
      lock,
      removeWallet,
      getWalletClient,
      sendTransaction,
    ]
  );

  return (
    <LocalWalletContext.Provider value={value}>
      {children}
    </LocalWalletContext.Provider>
  );
}

export function useLocalWallet() {
  const ctx = useContext(LocalWalletContext);
  if (!ctx) throw new Error("useLocalWallet outside provider");
  return ctx;
}
