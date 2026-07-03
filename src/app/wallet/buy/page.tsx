"use client";

import { WalletShell } from "@/components/wallet/WalletShell";
import { t } from "@/lib/wallet/i18n";

const PROVIDERS = [
  { name: "MoonPay", desc: "Tarjeta y transferencia bancaria", url: "https://www.moonpay.com/buy/bnb" },
  { name: "Transak", desc: "Más de 150 países", url: "https://global.transak.com/" },
  { name: "Ramp", desc: "Comisiones bajas", url: "https://ramp.network/buy" },
];

export default function BuyPage() {
  return (
    <WalletShell hideNav gradient>
      <div className="wallet-screen pt-2">
        <h1 className="wallet-page-title">{t.buyTitle}</h1>
        <p className="wallet-page-subtitle">{t.buySubtitle}</p>

        <div className="wallet-settings-group mt-8">
          {PROVIDERS.map(({ name, desc, url }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="wallet-link-row"
            >
              <div>
                <p className="font-semibold text-wallet-text">{name}</p>
                <p className="mt-0.5 text-sm text-wallet-muted">{desc}</p>
              </div>
              <span className="wallet-badge-soon">{t.soon}</span>
            </a>
          ))}
        </div>

        <p className="mt-auto pb-4 pt-10 text-center text-xs text-wallet-muted-dim">
          {t.kycNote}
        </p>
      </div>
    </WalletShell>
  );
}
