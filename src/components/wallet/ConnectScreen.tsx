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
    <div className="flex min-h-dvh flex-col px-6 pb-12 pt-16">
      <div className="flex flex-col items-center text-center">
        <TrustShield className="h-20 w-20" />
        <h1 className="mt-6 text-[28px] font-bold tracking-tight text-wallet-text">
          Trust Wallet
        </h1>
        <p className="mt-2 max-w-[300px] text-[15px] leading-relaxed text-wallet-muted">
          Your trusted gateway to Web3. Create a new wallet or import an existing one.
        </p>
      </div>

      <div className="mt-12 w-full max-w-sm space-y-3 mx-auto flex-1">
        <button
          type="button"
          onClick={() => setView("create")}
          className="wallet-btn-primary flex w-full items-center justify-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create a new wallet
        </button>

        <button
          type="button"
          onClick={() => setView("import")}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-wallet-border bg-wallet-elevated py-4 text-base font-semibold text-wallet-text transition hover:border-wallet-accent/40"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import an existing wallet
        </button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-wallet-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-wallet-bg px-3 text-xs text-wallet-muted">or</span>
          </div>
        </div>

        {connectors.map((connector) => (
          <button
            key={connector.uid}
            type="button"
            disabled={isPending}
            onClick={() => connect({ connector })}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-wallet-border py-3.5 text-sm font-medium text-wallet-secondary transition hover:border-wallet-muted"
          >
            Connect {connector.name}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-wallet-danger">{error.message}</p>
      )}

      <p className="mt-auto pt-8 text-center text-xs text-wallet-muted-dim">
        By continuing you agree to our Terms of Service. Never share your secret phrase.
      </p>
    </div>
  );
}
