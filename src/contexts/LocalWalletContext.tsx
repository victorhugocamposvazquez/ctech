"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  addWalletToVault,
  clearKeystore,
  decryptSecret,
  encryptSecret,
  getActiveWalletId,
  hasKeystore,
  listWalletMeta,
  loadKeystore,
  loadKeystoreById,
  removeWalletFromVault,
  setActiveWallet,
  type SecretPayload,
  type WalletMeta,
} from "@/lib/wallet/keystore";
import { WALLET_SYNC_APPLIED_EVENT } from "@/lib/wallet/pwa-sync";

type LocalStatus = "loading" | "none" | "locked" | "unlocked";

interface LocalWalletContextValue {
  status: LocalStatus;
  account: Account | null;
  address: Address | null;
  wallets: WalletMeta[];
  activeWalletId: string | null;
  addingWallet: boolean;
  startAddingWallet: () => void;
  cancelAddingWallet: () => void;
  switchWallet: (id: string) => void;
  createWallet: (password: string) => Promise<{ mnemonic: string; address: Address }>;
  importWallet: (payload: SecretPayload, password: string) => Promise<Address>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  removeWallet: (id?: string) => void;
  removeAllWallets: () => void;
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

function refreshWalletList(): WalletMeta[] {
  return listWalletMeta();
}

export function LocalWalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LocalStatus>("loading");
  const [account, setAccount] = useState<Account | null>(null);
  const [secret, setSecret] = useState<SecretPayload | null>(null);
  const [wallets, setWallets] = useState<WalletMeta[]>([]);
  const [activeWalletId, setActiveWalletIdState] = useState<string | null>(null);
  const [addingWallet, setAddingWallet] = useState(false);
  const unlockedCacheRef = useRef<Map<string, SecretPayload>>(new Map());

  const syncFromStorage = useCallback(() => {
    setWallets(refreshWalletList());
    setActiveWalletIdState(getActiveWalletId());
    unlockedCacheRef.current.clear();
    setAccount(null);
    setSecret(null);
    setStatus(hasKeystore() ? "locked" : "none");
  }, []);

  useEffect(() => {
    syncFromStorage();
    const onSync = () => syncFromStorage();
    window.addEventListener(WALLET_SYNC_APPLIED_EVENT, onSync);
    return () => window.removeEventListener(WALLET_SYNC_APPLIED_EVENT, onSync);
  }, [syncFromStorage]);

  const unlockWithSecret = useCallback((payload: SecretPayload, walletId?: string | null) => {
    const acc = accountFromSecret(payload);
    const id = walletId ?? getActiveWalletId();
    setSecret(payload);
    setAccount(acc);
    setStatus("unlocked");
    setAddingWallet(false);
    if (id) unlockedCacheRef.current.set(id, payload);
  }, []);

  const createWallet = useCallback(async (password: string) => {
    const mnemonic = generateMnemonic(english);
    const acc = mnemonicToAccount(mnemonic);
    const payload: SecretPayload = { type: "mnemonic", value: mnemonic };
    const store = await encryptSecret(payload, password, acc.address);
    const id = addWalletToVault(store);
    setWallets(refreshWalletList());
    setActiveWalletIdState(id);
    unlockWithSecret(payload, id);
    return { mnemonic, address: acc.address };
  }, [unlockWithSecret]);

  const importWallet = useCallback(
    async (payload: SecretPayload, password: string) => {
      const acc = accountFromSecret(payload);
      const store = await encryptSecret(payload, password, acc.address);
      const id = addWalletToVault(store);
      setWallets(refreshWalletList());
      setActiveWalletIdState(id);
      unlockWithSecret(payload, id);
      return acc.address;
    },
    [unlockWithSecret]
  );

  const unlock = useCallback(async (password: string) => {
    const store = loadKeystore();
    if (!store) throw new Error("No wallet found");
    const payload = await decryptSecret(store, password);
    unlockWithSecret(payload, getActiveWalletId());
  }, [unlockWithSecret]);

  const lock = useCallback(() => {
    unlockedCacheRef.current.clear();
    setAccount(null);
    setSecret(null);
    setAddingWallet(false);
    if (hasKeystore()) setStatus("locked");
    else setStatus("none");
  }, []);

  const switchWallet = useCallback((id: string) => {
    if (!setActiveWallet(id)) return;
    setActiveWalletIdState(id);
    setAddingWallet(false);

    const cached = unlockedCacheRef.current.get(id);
    if (cached) {
      unlockWithSecret(cached, id);
      return;
    }

    setAccount(null);
    setSecret(null);
    setStatus("locked");
  }, [unlockWithSecret]);

  const startAddingWallet = useCallback(() => {
    setAccount(null);
    setSecret(null);
    setAddingWallet(true);
  }, []);

  const cancelAddingWallet = useCallback(() => {
    setAddingWallet(false);
    if (hasKeystore()) setStatus("locked");
    else setStatus("none");
  }, []);

  const removeAllWallets = useCallback(() => {
    unlockedCacheRef.current.clear();
    clearKeystore();
    setWallets([]);
    setActiveWalletIdState(null);
    setAccount(null);
    setSecret(null);
    setAddingWallet(false);
    setStatus("none");
  }, []);

  const removeWallet = useCallback((id?: string) => {
    const targetId = id ?? getActiveWalletId();
    if (!targetId) return;
    unlockedCacheRef.current.delete(targetId);
    removeWalletFromVault(targetId);
    setWallets(refreshWalletList());
    setActiveWalletIdState(getActiveWalletId());
    setAccount(null);
    setSecret(null);
    setAddingWallet(false);
    if (hasKeystore()) setStatus("locked");
    else setStatus("none");
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
      wallets,
      activeWalletId,
      addingWallet,
      startAddingWallet,
      cancelAddingWallet,
      switchWallet,
      createWallet,
      importWallet,
      unlock,
      lock,
      removeWallet,
      removeAllWallets,
      getWalletClient,
      sendTransaction,
    }),
    [
      status,
      account,
      wallets,
      activeWalletId,
      addingWallet,
      startAddingWallet,
      cancelAddingWallet,
      switchWallet,
      createWallet,
      importWallet,
      unlock,
      lock,
      removeWallet,
      removeAllWallets,
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

/** Keystore de la wallet activa (p. ej. para biometría en unlock). */
export function useActiveKeystoreAddress(): string | undefined {
  const { activeWalletId } = useLocalWallet();
  if (!activeWalletId) return loadKeystore()?.address;
  return loadKeystoreById(activeWalletId)?.address;
}
