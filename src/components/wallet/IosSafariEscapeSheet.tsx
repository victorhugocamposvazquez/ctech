"use client";

import { useEffect, useState } from "react";
import { TrustShield } from "./TrustShield";
import { t } from "@/lib/wallet/i18n";
import {
  detectInAppBrowser,
  getInAppEscapeUrl,
  safariEscapeUrl,
} from "@/lib/wallet/pwa-ios";

/** Solo para iOS fuera de Safari (Instagram, Chrome, etc.) — hay que abrir Safari antes de instalar. */
export function IosSafariEscapeSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [urlCopied, setUrlCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [inApp, setInApp] = useState(detectInAppBrowser());

  useEffect(() => {
    if (!open) return;
    setPageUrl(window.location.href);
    setInApp(detectInAppBrowser());
  }, [open]);

  if (!open) return null;

  const escapeUrl = inApp ? getInAppEscapeUrl(pageUrl, inApp) : safariEscapeUrl(pageUrl);
  const inAppLabel =
    inApp === "instagram"
      ? "Instagram"
      : inApp === "facebook"
        ? "Facebook"
        : inApp === "twitter"
          ? "X (Twitter)"
          : inApp === "tiktok"
            ? "TikTok"
            : inApp === "telegram"
              ? "Telegram"
              : t.iosInAppGeneric;

  const copyUrl = async () => {
    await navigator.clipboard.writeText(pageUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 3000);
  };

  return (
    <div className="wallet-overlay !items-center !z-[200]" role="dialog" aria-modal="true">
      <button type="button" className="wallet-overlay-backdrop" onClick={onClose} aria-label={t.cancel} />
      <div className="wallet-sheet !rounded-3xl !mx-4 !mb-4 !w-[calc(100%-2rem)]">
        <div className="flex flex-col items-center text-center">
          <TrustShield className="h-14 w-14" />
          <h2 className="mt-4 text-lg font-bold text-wallet-text">{t.iosOpenSafariFirst}</h2>
          <p className="mt-2 text-sm leading-relaxed text-wallet-muted">
            {inApp
              ? t.iosInAppWarning.replace("{app}", inAppLabel)
              : t.iosOpenSafari}
          </p>
        </div>

        {escapeUrl && (
          <a href={escapeUrl} className="wallet-btn-primary mt-6 block text-center no-underline">
            {t.iosOpenSafariBtn}
          </a>
        )}

        <button type="button" onClick={() => void copyUrl()} className="wallet-btn-secondary mt-3 w-full">
          {urlCopied ? t.iosUrlCopied : t.iosCopyUrl}
        </button>

        <p className="mt-4 text-center text-xs text-wallet-muted-dim">{t.iosAfterSafariHint}</p>

        <button type="button" onClick={onClose} className="wallet-btn-ghost mt-4 w-full">
          {t.close}
        </button>
      </div>
    </div>
  );
}
