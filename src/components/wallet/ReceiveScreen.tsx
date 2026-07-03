"use client";

import { useState } from "react";
import { useWalletSession } from "@/hooks/wallet/useWalletSession";
import { walletChain } from "@/lib/wallet/config";

export function ReceiveScreen() {
  const { address } = useWalletSession();
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(address)}&bgcolor=ffffff&color=060608&margin=16`;

  return (
    <div className="wallet-screen items-center pt-4 text-center">
      <h1 className="wallet-page-title w-full text-left">Receive</h1>
      <p className="wallet-page-subtitle w-full text-left">
        Send only {walletChain.name} assets to this address
      </p>

      <div className="wallet-qr-frame mt-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="QR code" width={240} height={240} className="rounded-xl" />
      </div>

      <div className="wallet-card mt-8 w-full p-4 text-left">
        <p className="wallet-settings-label">Your address</p>
        <p className="mt-2 break-all font-mono text-[13px] leading-relaxed text-wallet-secondary">{address}</p>
      </div>

      <button type="button" onClick={() => void copy()} className="wallet-btn-primary mt-6 w-full max-w-sm">
        {copied ? "Copied!" : "Copy address"}
      </button>
    </div>
  );
}
