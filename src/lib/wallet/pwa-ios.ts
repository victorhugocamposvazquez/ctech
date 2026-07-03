/** Utilidades PWA específicas para iOS / Safari. */

export type InAppBrowser = "instagram" | "facebook" | "twitter" | "tiktok" | "telegram" | "generic" | null;

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isIosSafari(): boolean {
  if (!isIosDevice()) return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function iosMajorVersion(): number {
  const m = navigator.userAgent.match(/OS (\d+)_/);
  return m ? Number(m[1]) : 0;
}

/** Detecta navegadores in-app donde NO aparece "Añadir a pantalla de inicio". */
export function detectInAppBrowser(): InAppBrowser {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;

  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|Facebook|Messenger/i.test(ua)) return "facebook";
  if (/Twitter/i.test(ua)) return "twitter";
  if (/TikTok|musical_ly/i.test(ua)) return "tiktok";
  if (/Telegram/i.test(ua)) return "telegram";

  // WKWebView genérico sin token Safari
  if (isIosDevice() && !/Safari/i.test(ua)) return "generic";

  return null;
}

export function canInstallOnIos(): boolean {
  return isIosSafari() && !isStandalonePwa();
}

/** URL para abrir la página actual en Safari (iOS 17+). */
export function safariEscapeUrl(url: string): string | null {
  if (!isIosDevice()) return null;
  if (iosMajorVersion() >= 17) return `x-safari-${url}`;
  return `com-apple-mobilesafari-tab:${url}`;
}

/** URL para escapar del navegador in-app de Instagram. */
export function instagramEscapeUrl(url: string): string {
  return `instagram://extbrowser/?url=${encodeURIComponent(url)}`;
}

export function getInAppEscapeUrl(url: string, browser: InAppBrowser): string | null {
  if (!browser) return null;
  switch (browser) {
    case "instagram":
      return instagramEscapeUrl(url);
    case "facebook":
      return safariEscapeUrl(url);
    default:
      return safariEscapeUrl(url);
  }
}

export const SW_PATH = "/wallet-sw.js";
export const SW_SCOPE = "/wallet/";

export async function registerWalletServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  // En dev el plugin desactiva el SW salvo override explícito
  const devOverride = process.env.NEXT_PUBLIC_WALLET_PWA_DEV === "1";
  if (process.env.NODE_ENV === "development" && !devOverride) return null;

  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE });
    return reg;
  } catch {
    return null;
  }
}
