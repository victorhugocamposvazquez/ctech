/** Alineado con FlashUSDTLab.sol: durationSeconds <= 7 days */
export const FLASH_DURATION_MIN_MINUTES = 5;
export const FLASH_DURATION_MAX_MINUTES = 7 * 24 * 60; // 10080

export function clampFlashDurationMinutes(minutes: number): number {
  return Math.min(
    FLASH_DURATION_MAX_MINUTES,
    Math.max(FLASH_DURATION_MIN_MINUTES, Math.floor(minutes))
  );
}

export function flashDurationMinutesToSeconds(minutes: number): number {
  return clampFlashDurationMinutes(minutes) * 60;
}
