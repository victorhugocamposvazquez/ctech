"use client";

import { WalletShell } from "@/components/wallet/WalletShell";
import { t } from "@/lib/wallet/i18n";

const PROVIDERS = [
  { name: "MoonPay", desc: "Tarjeta y transferencia bancaria" },
  { name: "Transak", desc: "Más de 150 países" },
  { name: "Ramp", desc: "Comisiones bajas" },
];

export default function BuyPage() {
  return (
    <WalletShell hideNav gradient>
      <div className="wallet-screen wallet-screen--safe-bottom pt-2">
        <h1 className="wallet-page-title">{t.buyTitle}</h1>
        <p className="wallet-page-subtitle">{t.buySubtitle}</p>

        <div className="wallet-settings-group mt-8">
          {PROVIDERS.map(({ name, desc }) => (
            <div key={name} className="wallet-settings-row flex items-center justify-between">
              <div>
                <p className="font-semibold text-wallet-text">{name}</p>
                <p className="mt-0.5 text-sm text-wallet-muted">{desc}</p>
              </div>
              <span className="wallet-badge-soon">{t.soon}</span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-wallet-muted">{t.buyComingSoon}</p>
        <p className="mt-4 pb-4 text-center text-xs text-wallet-muted-dim">{t.kycNote}</p>
      </div>
    </WalletShell>
  );
}
