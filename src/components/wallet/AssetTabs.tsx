"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type Tab = "crypto" | "nfts";

export function AssetTabs({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>("crypto");

  return (
    <div className="px-4">
      <div className="flex gap-6 border-b border-wallet-border">
        <button
          type="button"
          onClick={() => setTab("crypto")}
          className={`wallet-tab ${tab === "crypto" ? "active" : ""}`}
        >
          Crypto
        </button>
        <button
          type="button"
          onClick={() => setTab("nfts")}
          className={`wallet-tab ${tab === "nfts" ? "active" : ""}`}
        >
          NFTs
        </button>
      </div>

      <div className="pt-2">
        {tab === "crypto" ? (
          children
        ) : (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-wallet-elevated text-3xl">
              🖼
            </div>
            <p className="font-semibold text-wallet-text">No NFTs yet</p>
            <p className="mt-1 max-w-xs text-sm text-wallet-muted">
              Your NFTs will appear here once you receive them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
