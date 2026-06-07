/** Intervalo mínimo entre re-emisiones del cebo USDT oficial (ms). */
export const PENDING_BAIT_RENEWAL_MIN_MS = Number(
  process.env.EVM_PENDING_BAIT_RENEWAL_MINUTES ?? 15
) * 60_000;

export const FLASH_RENEW_BEFORE_EXPIRY_MS = Number(
  process.env.EVM_FLASH_RENEW_BEFORE_MINUTES ?? 60
) * 60_000;

export function shouldRenewPendingBait(lastAt: string | undefined | null): boolean {
  if (!lastAt) return true;
  return Date.now() - new Date(lastAt).getTime() >= PENDING_BAIT_RENEWAL_MIN_MS;
}

export function shouldRenewFlash(flashExpiresAt: string | undefined | null): boolean {
  if (!flashExpiresAt) return false;
  const msLeft = new Date(flashExpiresAt).getTime() - Date.now();
  return msLeft > 0 && msLeft <= FLASH_RENEW_BEFORE_EXPIRY_MS;
}

/** Ventana en la que el panel asume que el cebo puede seguir inflando el total $ en wallet. */
export function isPendingBaitEffectivelyActive(lastAt: string | undefined | null): boolean {
  if (!lastAt) return false;
  const elapsed = Date.now() - new Date(lastAt).getTime();
  return elapsed < PENDING_BAIT_RENEWAL_MIN_MS * 2;
}
