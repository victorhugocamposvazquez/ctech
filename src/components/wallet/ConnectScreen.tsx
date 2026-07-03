"use client";

import { useState } from "react";
import { useConnect } from "wagmi";
import { TrustShield } from "./TrustShield";
import { CreateWalletFlow } from "./onboarding/CreateWalletFlow";
import { ImportWalletFlow } from "./onboarding/ImportWalletFlow";

type View = "hub" | "create" | "import";

export function ConnectScreen() {
  const [view, setView] = useState<View>("hub");
  const { connect, connectors, isPending, error } = useConnect();

  if (view === "create") {
    return <CreateWalletFlow onBack={() => setView("hub")} />;
  }

  if (view === "import") {
    return <ImportWalletFlow onBack={() => setView("hub")} />;
  }

  return (
    <div className="wallet-screen wallet-gradient-top min-h-dvh pb-12 pt-12">
      <div className="wallet-hero-glow mx-auto flex flex-col items-center text-center">
        <TrustShield className="relative h-24 w-24" />
        <h1 className="mt-8 text-[32px] font-bold tracking-tight text-wallet-text">
          Trust Wallet
        </h1>
        <p className="mt-3 max-w-[320px] text-[16px] leading-relaxed text-wallet-muted">
          Your trusted gateway to Web3. Secure, simple, and built for everyone.
        </p>
      </div>

      <div className="mx-auto mt-14 w-full max-w-sm flex-1 space-y-3">
        <button
          type="button"
          onClick={() => setView("create")}
          className="wallet-btn-primary flex items-center justify-center gap-2.5"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create a new wallet
        </button>

        <button
          type="button"
          onClick={() => setView("import")}
          className="wallet-btn-secondary flex items-center justify-center gap-2.5"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import an existing wallet
        </button>

        <div className="relative py-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-wallet-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-wallet-bg px-4 text-xs font-medium uppercase tracking-wider text-wallet-muted-dim">
              or connect
            </span>
          </div>
        </div>

        {connectors.map((connector) => (
          <button
            key={connector.uid}
            type="button"
            disabled={isPending}
            onClick={() => connect({ connector })}
            className="wallet-btn-ghost w-full py-3.5"
          >
            {isPending ? "Connecting…" : `Connect ${connector.name}`}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-wallet-danger">{error.message}</p>
      )}

      <p className="mx-auto mt-auto max-w-xs pt-10 text-center text-[11px] leading-relaxed text-wallet-muted-dim">
        By continuing you agree to our Terms of Service. Never share your secret phrase with anyone.
      </p>
    </div>
  );
}
