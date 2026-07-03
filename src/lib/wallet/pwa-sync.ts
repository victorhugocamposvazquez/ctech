import { hasKeystore } from "./keystore";
import { isIosDevice, isStandalonePwa, registerWalletServiceWorker } from "./pwa-ios";

const SYNC_PATH = "/wallet/__sync";
const RELOAD_FLAG = "wallet_sync_reloaded_v1";

/** Claves fijas de localStorage que deben sobrevivir Safari → PWA en iOS. */
export const WALLET_SYNC_KEYS = [
  "wallet_theme",
  "wallet_autolock_ms",
  "tw_vault_v2",
  "tw_keystore_v1",
  "wallet_mode",
  "wallet_tx_history_v1",
] as const;

const BIO_KEY_PREFIX = "wallet_bio_v1_";

function collectBioKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(BIO_KEY_PREFIX)) keys.push(k);
  }
  return keys;
}

export type WalletSnapshot = Record<string, string>;

export function collectWalletSnapshot(): WalletSnapshot {
  if (typeof window === "undefined") return {};
  const snap: WalletSnapshot = {};
  const keys = [...WALLET_SYNC_KEYS, ...collectBioKeys()];
  for (const key of keys) {
    const v = localStorage.getItem(key);
    if (v != null) snap[key] = v;
  }
  return snap;
}

function isSyncKey(key: string): boolean {
  return (
    WALLET_SYNC_KEYS.includes(key as (typeof WALLET_SYNC_KEYS)[number]) ||
    key.startsWith(BIO_KEY_PREFIX)
  );
}

export function applyWalletSnapshot(snap: WalletSnapshot): boolean {
  if (typeof window === "undefined") return false;
  let changed = false;
  for (const [key, value] of Object.entries(snap)) {
    if (!isSyncKey(key)) continue;
    if (localStorage.getItem(key) !== value) {
      localStorage.setItem(key, value);
      changed = true;
    }
  }
  return changed;
}

async function waitForBridge(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  await registerWalletServiceWorker();
  await navigator.serviceWorker.ready;
  return true;
}

/** Guarda snapshot en cache compartida (Safari → puente). */
export async function pushWalletSnapshot(): Promise<void> {
  if (typeof window === "undefined") return;
  const snap = collectWalletSnapshot();
  if (Object.keys(snap).length === 0) return;
  if (!(await waitForBridge())) return;

  try {
    await fetch(SYNC_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snap),
      cache: "no-store",
    });
  } catch {
    /* SW aún no controla la página */
  }
}

/** Recupera snapshot del puente (PWA ← Safari). */
export async function pullWalletSnapshot(): Promise<WalletSnapshot | null> {
  if (!(await waitForBridge())) return null;

  try {
    const res = await fetch(SYNC_PATH, { method: "GET", cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as WalletSnapshot;
    if (!data || typeof data !== "object" || Object.keys(data).length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Push debounced tras cambios de ajustes / wallet. */
export function scheduleWalletSnapshotPush(): void {
  if (typeof window === "undefined" || isStandalonePwa()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushWalletSnapshot();
  }, 400);
}

export const WALLET_SYNC_APPLIED_EVENT = "wallet-sync-applied";

/**
 * En PWA instalada: importa datos del puente.
 * Devuelve true si se aplicó algo nuevo.
 */
export async function migrateFromBrowserBridge(): Promise<boolean> {
  if (!isStandalonePwa()) return false;

  const remote = await pullWalletSnapshot();
  if (!remote) return false;

  const hadKeystore = hasKeystore();
  const changed = applyWalletSnapshot(remote);
  if (!changed) return false;

  window.dispatchEvent(new Event(WALLET_SYNC_APPLIED_EVENT));

  // Recargar una vez si apareció la wallet tras migrar
  if (!hadKeystore && hasKeystore() && !sessionStorage.getItem(RELOAD_FLAG)) {
    sessionStorage.setItem(RELOAD_FLAG, "1");
    window.location.reload();
    return true;
  }

  return true;
}

/** ¿Debemos activar el puente? Solo iOS (Android comparte storage). */
export function shouldUseStorageBridge(): boolean {
  return isIosDevice();
}
