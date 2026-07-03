"use client";

import { WalletShell } from "@/components/wallet/WalletShell";

const PROVIDERS = [
  { name: "MoonPay", desc: "Card & bank transfer" },
  { name: "Transak", desc: "150+ countries" },
  { name: "Ramp", desc: "Low fees" },
];

export default function BuyPage() {
  return (
    <WalletShell hideNav gradient>
      <div className="wallet-screen pt-2">
        <h1 className="wallet-page-title">Buy Crypto</h1>
        <p className="wallet-page-subtitle">
          Purchase crypto with card or bank transfer via on-ramp partners.
        </p>

        <div className="wallet-settings-group mt-8">
          {PROVIDERS.map(({ name, desc }, i) => (
            <button
              key={name}
              type="button"
              className={`wallet-settings-row flex w-full items-center justify-between text-left transition hover:bg-white/[0.02] ${i > 0 ? "" : ""}`}
            >
              <div>
                <p className="font-semibold text-wallet-text">{name}</p>
                <p className="mt-0.5 text-sm text-wallet-muted">{desc}</p>
              </div>
              <span className="rounded-full bg-wallet-accent-soft px-3 py-1 text-xs font-semibold text-wallet-accent">
                Soon
              </span>
            </button>
          ))}
        </div>

        <p className="mt-auto pb-4 pt-10 text-center text-xs text-wallet-muted-dim">
          KYC required by payment provider
        </p>
      </div>
    </WalletShell>
  );
}
