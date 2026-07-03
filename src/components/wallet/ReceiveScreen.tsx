"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { walletChain } from "@/lib/wallet/config";

export function ReceiveScreen() {
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(address)}&bgcolor=ffffff&color=0b0b0c&margin=16`;

  return (
    <div className="flex flex-col items-center px-6 pt-6">
      <h1 className="w-full text-2xl font-bold text-wallet-text">Receive</h1>
      <p className="mt-2 w-full text-[15px] text-wallet-muted">
        Send only {walletChain.name} assets to this address
      </p>

      <div className="mt-8 rounded-3xl bg-white p-5 shadow-xl shadow-black/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="QR code" width={240} height={240} className="rounded-xl" />
      </div>

      <div className="mt-8 w-full rounded-2xl bg-wallet-elevated p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-wallet-muted">
          Your address
        </p>
        <p className="mt-2 break-all font-mono text-[13px] leading-relaxed text-wallet-secondary">
          {address}
        </p>
      </div>

      <button
        type="button"
        onClick={() => void copy()}
        className="wallet-btn-primary mt-6 max-w-sm"
      >
        {copied ? "Copied!" : "Copy address"}
      </button>
    </div>
  );
}
