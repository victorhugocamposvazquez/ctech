"use client";

import { useConnect, useAccount } from "wagmi";
import { TrustShield } from "./TrustShield";

export function ConnectScreen() {
  const { connect, connectors, isPending, error } = useConnect();
  const { isConnecting } = useAccount();

  const busy = isPending || isConnecting;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pb-12 pt-16 text-center">
      <TrustShield className="h-20 w-20" />
      <h1 className="mt-6 text-[28px] font-bold tracking-tight text-wallet-text">
        Trust Wallet
      </h1>
      <p className="mt-2 max-w-[280px] text-[15px] leading-relaxed text-wallet-muted">
        The most trusted &amp; secure crypto wallet. Connect to access your
        assets on BNB Smart Chain.
      </p>

      <div className="mt-12 w-full max-w-sm space-y-3">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            type="button"
            disabled={busy}
            onClick={() => connect({ connector })}
            className="wallet-btn-primary flex items-center justify-center gap-2"
          >
            {busy ? (
              "Connecting…"
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v11A2.5 2.5 0 0117.5 20h-11A2.5 2.5 0 014 17.5v-11z" />
                </svg>
                Connect {connector.name}
              </>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-sm text-wallet-danger">{error.message}</p>
      )}

      <p className="mt-10 text-xs text-wallet-muted-dim">
        By connecting, you agree to our Terms of Service
      </p>
    </div>
  );
}
