"use client";

import { WalletShell } from "@/components/wallet/WalletShell";

export default function WalletSwapPage() {
  return (
    <WalletShell gradient>
      <div className="wallet-empty min-h-[55vh]">
        <div className="wallet-empty-icon">
          <svg className="h-8 w-8 text-wallet-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-wallet-text">Swap Tokens</h2>
        <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-wallet-muted">
          Swap between BNB, USDT and other tokens instantly via PancakeSwap.
        </p>
        <a
          href="https://pancakeswap.finance/swap"
          target="_blank"
          rel="noopener noreferrer"
          className="wallet-btn-primary mt-8 max-w-xs"
        >
          Open PancakeSwap
        </a>
      </div>
    </WalletShell>
  );
}
