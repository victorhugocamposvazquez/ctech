"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { t } from "@/lib/wallet/i18n";

type Tab = "crypto" | "nfts";

export function AssetTabs({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>("crypto");

  return (
    <div className="px-5">
      <div className="wallet-tabs">
        <button
          type="button"
          onClick={() => setTab("crypto")}
          className={`wallet-tab ${tab === "crypto" ? "active" : ""}`}
        >
          {t.crypto}
        </button>
        <button
          type="button"
          onClick={() => setTab("nfts")}
          className={`wallet-tab ${tab === "nfts" ? "active" : ""}`}
        >
          {t.nfts}
        </button>
      </div>

      <div className="pt-4 pb-2">
        {tab === "crypto" ? (
          children
        ) : (
          <div className="wallet-empty py-16">
            <div className="wallet-empty-icon">🖼</div>
            <p className="font-semibold text-wallet-text">{t.noNfts}</p>
            <p className="mt-1 max-w-xs text-sm text-wallet-muted">{t.noNftsHint}</p>
          </div>
        )}
      </div>
    </div>
  );
}
