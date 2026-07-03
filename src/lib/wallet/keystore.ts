import { clearBiometricEnrollment } from "@/lib/wallet/biometrics";

const STORAGE_KEY = "tw_keystore_v1";

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

export function saveKeystore(store: StoredKeystore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  localStorage.setItem("wallet_mode", "local");
}

export function loadKeystore(): StoredKeystore | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredKeystore;
  } catch {
    return null;
  }
}

export function clearKeystore() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("wallet_mode");
  clearBiometricEnrollment();
}

export function hasKeystore(): boolean {
  return !!loadKeystore();
}
