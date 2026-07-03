import { clearBiometricEnrollment } from "./biometrics";
import { scheduleWalletSnapshotPush } from "./pwa-sync";

const VAULT_KEY = "tw_vault_v2";
const LEGACY_KEY = "tw_keystore_v1";

export type SecretPayload =
  | { type: "mnemonic"; value: string }
  | { type: "privateKey"; value: string };

export interface StoredKeystore {
  version: 1;
  address: string;
  secretType: "mnemonic" | "privateKey";
  ciphertext: string;
  iv: string;
  salt: string;
}

export interface WalletMeta {
  id: string;
  address: string;
  label: string;
  createdAt: number;
}

interface VaultEntry {
  id: string;
  label: string;
  createdAt: number;
  keystore: StoredKeystore;
}

export interface WalletVault {
  version: 2;
  activeId: string | null;
  wallets: VaultEntry[];
}

function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(password: string, salt: BufferSource) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptSecret(
  payload: SecretPayload,
  password: string,
  address: string
): Promise<StoredKeystore> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  return {
    version: 1,
    address,
    secretType: payload.type,
    ciphertext: bufToBase64(encrypted),
    iv: bufToBase64(iv),
    salt: bufToBase64(salt),
  };
}

export async function decryptSecret(
  store: StoredKeystore,
  password: string
): Promise<SecretPayload> {
  const key = await deriveKey(password, base64ToBuf(store.salt));
  const iv = new Uint8Array(base64ToBuf(store.iv));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    base64ToBuf(store.ciphertext)
  );
  const json = new TextDecoder().decode(decrypted);
  return JSON.parse(json) as SecretPayload;
}

function migrateLegacyVault(): WalletVault | null {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  try {
    const keystore = JSON.parse(raw) as StoredKeystore;
    const id = crypto.randomUUID();
    const vault: WalletVault = {
      version: 2,
      activeId: id,
      wallets: [
        {
          id,
          label: "Wallet 1",
          createdAt: Date.now(),
          keystore,
        },
      ],
    };
    localStorage.removeItem(LEGACY_KEY);
    persistVault(vault);
    return vault;
  } catch {
    return null;
  }
}

function persistVault(vault: WalletVault): void {
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  localStorage.setItem("wallet_mode", vault.wallets.length > 0 ? "local" : "");
  if (vault.wallets.length === 0) localStorage.removeItem("wallet_mode");
  scheduleWalletSnapshotPush();
}

export function loadVault(): WalletVault {
  const raw = localStorage.getItem(VAULT_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as WalletVault;
    } catch {
      /* fallthrough */
    }
  }
  return migrateLegacyVault() ?? { version: 2, activeId: null, wallets: [] };
}

export function saveVault(vault: WalletVault): void {
  persistVault(vault);
}

export function hasKeystore(): boolean {
  return loadVault().wallets.length > 0;
}

export function listWalletMeta(): WalletMeta[] {
  return loadVault().wallets.map(({ id, label, createdAt, keystore }) => ({
    id,
    label,
    createdAt,
    address: keystore.address,
  }));
}

export function getActiveWalletId(): string | null {
  const vault = loadVault();
  if (!vault.activeId) return vault.wallets[0]?.id ?? null;
  if (vault.wallets.some((w) => w.id === vault.activeId)) return vault.activeId;
  return vault.wallets[0]?.id ?? null;
}

export function loadKeystore(): StoredKeystore | null {
  const vault = loadVault();
  const activeId = getActiveWalletId();
  if (!activeId) return null;
  return vault.wallets.find((w) => w.id === activeId)?.keystore ?? null;
}

export function loadKeystoreById(id: string): StoredKeystore | null {
  return loadVault().wallets.find((w) => w.id === id)?.keystore ?? null;
}

export function setActiveWallet(id: string): boolean {
  const vault = loadVault();
  if (!vault.wallets.some((w) => w.id === id)) return false;
  saveVault({ ...vault, activeId: id });
  return true;
}

export function addWalletToVault(keystore: StoredKeystore, label?: string): string {
  const vault = loadVault();
  const exists = vault.wallets.find(
    (w) => w.keystore.address.toLowerCase() === keystore.address.toLowerCase()
  );
  if (exists) {
    saveVault({ ...vault, activeId: exists.id });
    return exists.id;
  }

  const id = crypto.randomUUID();
  const entry: VaultEntry = {
    id,
    label: label ?? `Wallet ${vault.wallets.length + 1}`,
    createdAt: Date.now(),
    keystore,
  };
  saveVault({
    version: 2,
    activeId: id,
    wallets: [...vault.wallets, entry],
  });
  return id;
}

/** @deprecated use addWalletToVault — mantiene compatibilidad */
export function saveKeystore(store: StoredKeystore): void {
  addWalletToVault(store);
}

export function removeWalletFromVault(id: string): void {
  const vault = loadVault();
  const removed = vault.wallets.find((w) => w.id === id);
  if (!removed) return;

  clearBiometricEnrollment(removed.keystore.address);

  const wallets = vault.wallets.filter((w) => w.id !== id);
  let activeId = vault.activeId;
  if (activeId === id) {
    activeId = wallets[0]?.id ?? null;
  }

  if (wallets.length === 0) {
    localStorage.removeItem(VAULT_KEY);
    localStorage.removeItem("wallet_mode");
  } else {
    saveVault({ version: 2, activeId, wallets });
  }
  scheduleWalletSnapshotPush();
}

export function clearKeystore(): void {
  const vault = loadVault();
  for (const w of vault.wallets) {
    clearBiometricEnrollment(w.keystore.address);
  }
  localStorage.removeItem(VAULT_KEY);
  localStorage.removeItem(LEGACY_KEY);
  localStorage.removeItem("wallet_mode");
  scheduleWalletSnapshotPush();
}

export const VAULT_STORAGE_KEY = VAULT_KEY;
