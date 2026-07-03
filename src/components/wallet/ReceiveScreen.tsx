"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { shortenAddress } from "@/lib/wallet/format";
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

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(address)}&bgcolor=1a1a1e&color=ffffff`;

  return (
    <div className="flex flex-col items-center px-4 pt-6">
      <p className="text-sm text-wallet-muted">Recibe {walletChain.name}</p>
      <div className="mt-6 rounded-3xl bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt="QR de dirección"
          width={220}
          height={220}
          className="rounded-xl"
        />
      </div>

      <p className="mt-6 text-center font-mono text-sm leading-relaxed text-wallet-text">
        {address}
      </p>

      <button
        type="button"
        onClick={() => void copy()}
        className="mt-6 w-full max-w-xs rounded-2xl bg-wallet-accent py-4 font-bold text-white"
      >
        {copied ? "¡Copiado!" : "Copiar dirección"}
      </button>

      <p className="mt-4 text-center text-xs text-wallet-muted">
        Solo envía activos de <strong>{walletChain.name}</strong>. Otros activos
        se pueden perder.
      </p>
    </div>
  );
}
