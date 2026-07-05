const STORAGE_PREFIX = "wallet_transfer_modal_shown_v1";
const MAX_IDS = 100;

function storageKey(address: string): string {
  return `${STORAGE_PREFIX}_${address.toLowerCase()}`;
}

export function loadShownTransferModalIds(address: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as string[];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

export function markTransferModalShown(address: string, notificationId: string): void {
  if (typeof window === "undefined") return;
  try {
    const ids = loadShownTransferModalIds(address);
    ids.add(notificationId);
    const trimmed = [...ids].slice(-MAX_IDS);
    localStorage.setItem(storageKey(address), JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

export function wasTransferModalShown(address: string, notificationId: string): boolean {
  return loadShownTransferModalIds(address).has(notificationId);
}
