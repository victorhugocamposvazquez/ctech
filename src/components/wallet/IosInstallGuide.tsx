"use client";

import { useState } from "react";
import { TrustShield } from "./TrustShield";
import { t } from "@/lib/wallet/i18n";
import { isIosSafari } from "./ios-safari";

interface IosInstallGuideProps {
  open: boolean;
  onClose: () => void;
}

export function IosInstallGuide({ open, onClose }: IosInstallGuideProps) {
  const [urlCopied, setUrlCopied] = useState(false);

  if (!open) return null;

  const inSafari = isIosSafari();

  const copyUrl = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 3000);
  };

  return (
    <div className="wallet-overlay !items-center !z-[200]" role="dialog" aria-modal="true">
      <button type="button" className="wallet-overlay-backdrop" onClick={onClose} aria-label={t.cancel} />
      <div className="wallet-sheet !max-h-[90dvh] !overflow-y-auto !rounded-3xl !mx-4 !mb-4 !w-[calc(100%-2rem)]">
        <div className="flex flex-col items-center text-center">
          <TrustShield className="h-16 w-16" />
          <h2 className="mt-4 text-xl font-bold text-wallet-text">{t.iosInstallTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-wallet-muted">{t.iosInstallSubtitle}</p>
        </div>

        {!inSafari && (
          <>
            <div className="wallet-alert mt-6 text-left">{t.iosOpenSafari}</div>
            <button type="button" onClick={() => void copyUrl()} className="wallet-btn-secondary mt-4 w-full">
              {urlCopied ? t.iosUrlCopied : t.iosCopyUrl}
            </button>
          </>
        )}

        <ol className="mt-6 space-y-5">
          {inSafari && (
            <li className="flex gap-4 text-left">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wallet-accent text-sm font-bold text-[#060608]">
                1
              </span>
              <div>
                <p className="font-semibold text-wallet-text">{t.iosStep1Title}</p>
                <p className="mt-1 text-sm text-wallet-muted">{t.iosStep1Desc}</p>
                <div className="mt-3 flex justify-center rounded-xl border border-wallet-border bg-black/30 py-4">
                  <svg className="h-8 w-8 text-wallet-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
              </div>
            </li>
          )}
          <li className="flex gap-4 text-left">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wallet-accent text-sm font-bold text-[#060608]">
              {inSafari ? 2 : 1}
            </span>
            <div>
              <p className="font-semibold text-wallet-text">{t.iosStep2Title}</p>
              <p className="mt-1 text-sm text-wallet-muted">{t.iosStep2Desc}</p>
            </div>
          </li>
          <li className="flex gap-4 text-left">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wallet-accent text-sm font-bold text-[#060608]">
              {inSafari ? 3 : 2}
            </span>
            <div>
              <p className="font-semibold text-wallet-text">{t.iosStep3Title}</p>
              <p className="mt-1 text-sm text-wallet-muted">{t.iosStep3Desc}</p>
            </div>
          </li>
        </ol>

        <p className="mt-6 text-center text-xs leading-relaxed text-wallet-muted-dim">
          {t.iosInstallNote}
        </p>

        <button type="button" onClick={onClose} className="wallet-btn-primary mt-6">
          {t.iosInstallDone}
        </button>
      </div>
    </div>
  );
}
