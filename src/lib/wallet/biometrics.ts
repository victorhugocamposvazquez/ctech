import { scheduleWalletSnapshotPush } from "./pwa-sync";
import { loadKeystore } from "./keystore";

const BIO_KEY_PREFIX = "wallet_bio_v1_";
const LEGACY_BIO_KEY = "wallet_bio_v1";
const PRF_LABEL = new TextEncoder().encode("ctech-wallet-bio-v1");

interface BioStore {
  credentialId: string;
  encPassword: string;
  iv: string;
}

type PrfExtensionResults = {
  prf?: {
    enabled?: boolean;
    results?: { first?: ArrayBuffer };
  };
};

function bioKey(address: string): string {
  return `${BIO_KEY_PREFIX}${address.toLowerCase()}`;
}

function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const buffer = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function rpId(): string {
  return window.location.hostname;
}

function loadBioStore(address: string): BioStore | null {
  const key = bioKey(address);
  let raw = localStorage.getItem(key);
  if (!raw && address === loadKeystore()?.address) {
    raw = localStorage.getItem(LEGACY_BIO_KEY);
    if (raw) {
      localStorage.setItem(key, raw);
      localStorage.removeItem(LEGACY_BIO_KEY);
    }
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BioStore;
  } catch {
    return null;
  }
}

export function isBiometricEnabled(address?: string): boolean {
  const addr = address ?? loadKeystore()?.address;
  if (!addr) return false;
  return !!loadBioStore(addr);
}

export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential || !window.crypto?.subtle) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function clearBiometricEnrollment(address?: string): void {
  if (address) {
    localStorage.removeItem(bioKey(address));
  } else {
    const ks = loadKeystore();
    if (ks) localStorage.removeItem(bioKey(ks.address));
    localStorage.removeItem(LEGACY_BIO_KEY);
  }
  scheduleWalletSnapshotPush();
}

async function encryptPasswordWithPrf(
  prfOutput: ArrayBuffer,
  password: string
): Promise<{ encPassword: string; iv: string }> {
  const key = await crypto.subtle.importKey(
    "raw",
    prfOutput,
    "AES-GCM",
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(password)
  );
  return { encPassword: bufToBase64(enc), iv: bufToBase64(iv) };
}

async function decryptPasswordWithPrf(
  prfOutput: ArrayBuffer,
  store: BioStore
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    prfOutput,
    "AES-GCM",
    false,
    ["decrypt"]
  );
  const iv = base64ToBytes(store.iv);
  const ciphertext = base64ToBytes(store.encPassword);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

/** Registra passkey del dispositivo y guarda la contraseña cifrada con PRF. */
export async function enrollBiometric(password: string): Promise<void> {
  const keystore = loadKeystore();
  if (!keystore) throw new Error("No wallet");

  const userId = new TextEncoder().encode(keystore.address.toLowerCase());
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Trust Wallet", id: rpId() },
      user: {
        id: userId,
        name: keystore.address.slice(0, 10),
        displayName: "Trust Wallet",
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "required",
      },
      extensions: {
        prf: { eval: { first: PRF_LABEL } },
      },
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Cancelled");

  const prfOut = (credential.getClientExtensionResults() as PrfExtensionResults).prf
    ?.results?.first;
  if (!prfOut) throw new Error("PRF not supported");

  const { encPassword, iv } = await encryptPasswordWithPrf(prfOut, password);

  localStorage.setItem(
    bioKey(keystore.address),
    JSON.stringify({
      credentialId: bufToBase64(credential.rawId),
      encPassword,
      iv,
    } satisfies BioStore)
  );
  scheduleWalletSnapshotPush();
}

/** Desbloquea con Face ID / Touch ID / huella. Devuelve la contraseña de la wallet. */
export async function unlockWithBiometric(address?: string): Promise<string> {
  const addr = address ?? loadKeystore()?.address;
  if (!addr) throw new Error("No wallet");

  const store = loadBioStore(addr);
  if (!store) throw new Error("Not enrolled");

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: rpId(),
      allowCredentials: [
        {
          type: "public-key",
          id: base64ToBytes(store.credentialId),
        },
      ],
      userVerification: "required",
      extensions: {
        prf: { eval: { first: PRF_LABEL } },
      },
    },
  })) as PublicKeyCredential | null;

  if (!assertion) throw new Error("Cancelled");

  const prfOut = (assertion.getClientExtensionResults() as PrfExtensionResults).prf
    ?.results?.first;
  if (!prfOut) throw new Error("PRF failed");

  return decryptPasswordWithPrf(prfOut, store);
}
