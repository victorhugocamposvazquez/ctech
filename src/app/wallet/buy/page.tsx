"use client";

import { WalletShell } from "@/components/wallet/WalletShell";

export default function BuyPage() {
  return (
    <WalletShell hideNav>
      <div className="flex min-h-[70vh] flex-col px-6 pt-8">
        <h1 className="text-2xl font-bold text-wallet-text">Buy Crypto</h1>
        <p className="mt-2 text-[15px] text-wallet-muted">
          Purchase crypto with card or bank transfer via our on-ramp partners.
        </p>

        <div className="mt-8 space-y-3">
          {["MoonPay", "Transak", "Ramp"].map((provider) => (
            <button
              key={provider}
              type="button"
              className="flex w-full items-center justify-between rounded-2xl border border-wallet-border bg-wallet-elevated px-5 py-4 text-left transition hover:border-wallet-accent/40"
            >
              <span className="font-semibold text-wallet-text">{provider}</span>
              <span className="text-sm text-wallet-muted">Soon</span>
            </button>
          ))}
        </div>

        <p className="mt-auto pb-8 text-center text-xs text-wallet-muted-dim">
          KYC required by payment provider
        </p>
      </div>
    </WalletShell>
  );
}
