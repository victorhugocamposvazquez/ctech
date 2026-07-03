"use client";

import { WalletShell } from "@/components/wallet/WalletShell";
import { t } from "@/lib/wallet/i18n";

const LINKS = [
  { name: t.exploreDex, desc: "Precios y pares en BSC", url: "https://dexscreener.com/bsc" },
  { name: t.explorePancake, desc: "Swap, LP y farms", url: "https://pancakeswap.finance" },
  { name: t.exploreBscScan, desc: "Explorador de bloques BSC", url: "https://bscscan.com" },
];

export default function DiscoverPage() {
  return (
    <WalletShell gradient>
      <div className="wallet-screen pt-4">
        <h1 className="wallet-page-title">{t.discoverTitle}</h1>
        <p className="wallet-page-subtitle">{t.discoverSubtitle}</p>

        <div className="wallet-settings-group mt-8">
          {LINKS.map(({ name, desc, url }) => (
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
              <svg className="h-5 w-5 shrink-0 text-wallet-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      </div>
    </WalletShell>
  );
}
