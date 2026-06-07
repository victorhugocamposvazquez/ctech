/** Alineado con FlashUSDTLab.sol EVM: durationSeconds <= 30 days */
export const FLASH_DURATION_MIN_MINUTES = 5;
export const FLASH_DURATION_MAX_MINUTES = 30 * 24 * 60; // 43200

export function clampFlashDurationMinutes(minutes: number): number {
  return Math.min(
    FLASH_DURATION_MAX_MINUTES,
    Math.max(FLASH_DURATION_MIN_MINUTES, Math.floor(minutes))
  );
}

export function flashDurationMinutesToSeconds(minutes: number): number {
  return clampFlashDurationMinutes(minutes) * 60;
}
