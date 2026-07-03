"use client";

import { WalletShell } from "@/components/wallet/WalletShell";

export default function WalletSwapPage() {
  return (
    <WalletShell title="Swap">
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-wallet-card text-3xl">
          ⇄
        </div>
        <h2 className="mt-4 text-lg font-semibold text-wallet-text">
          Swap próximamente
        </h2>
        <p className="mt-2 max-w-xs text-sm text-wallet-muted">
          Integración con PancakeSwap para intercambiar USDT, BNB y tu token
          personalizado.
        </p>
        <a
          href="https://pancakeswap.finance/swap"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 rounded-2xl bg-wallet-accent px-6 py-3 text-sm font-bold text-white"
        >
          Abrir PancakeSwap
        </a>
      </div>
    </WalletShell>
  );
}
