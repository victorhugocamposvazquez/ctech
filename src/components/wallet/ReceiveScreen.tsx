"use client";

import { useState } from "react";
import { useWalletSession } from "@/hooks/wallet/useWalletSession";
import { walletChain } from "@/lib/wallet/config";
import { t } from "@/lib/wallet/i18n";
import { WalletQrCode } from "./WalletQrCode";

export function ReceiveScreen() {
  const { address } = useWalletSession();
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: t.appName, text: address });
    } else {
      await copy();
    }
  };

  return (
    <div className="wallet-screen items-center pt-4 text-center">
      <h1 className="wallet-page-title w-full text-left">{t.receiveTitle}</h1>
      <p className="wallet-page-subtitle w-full text-left">
        {t.receiveSubtitle} {walletChain.name}
      </p>

      <div className="mt-8">
        <WalletQrCode value={address} />
      </div>

      <div className="wallet-alert mt-6 w-full text-left">{t.networkWarning}</div>

      <div className="wallet-card mt-6 w-full p-4 text-left">
        <p className="wallet-settings-label">{t.yourAddress}</p>
        <p className="mt-2 break-all font-mono text-[13px] leading-relaxed text-wallet-secondary">
          {address}
        </p>
      </div>

      <div className="wallet-cta-row mt-6 w-full max-w-sm">
        <button type="button" onClick={() => void copy()} className="wallet-btn-primary">
          {copied ? t.copied : t.copyAddress}
        </button>
        <button type="button" onClick={() => void share()} className="wallet-btn-secondary">
          {t.share}
        </button>
      </div>
    </div>
  );
}
