const STORAGE_KEY = "twc-cookie-consent";

export type CookieConsent = "accepted" | "rejected";

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "accepted" || value === "rejected" ? value : null;
}

export function setCookieConsent(value: CookieConsent): void {
  localStorage.setItem(STORAGE_KEY, value);
}
