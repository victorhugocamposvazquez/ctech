"use client";

import { useConnect, useAccount } from "wagmi";
import { APP_NAME } from "@/lib/wallet/config";

export function ConnectScreen() {
  const { connect, connectors, isPending, error } = useConnect();
  const { isConnecting } = useAccount();

  const busy = isPending || isConnecting;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-wallet-accent to-blue-600 shadow-lg shadow-wallet-accent/30">
        <svg className="h-12 w-12 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v11A2.5 2.5 0 0117.5 20h-11A2.5 2.5 0 014 17.5v-11zM16 12.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-wallet-text">{APP_NAME}</h1>
      <p className="mt-2 max-w-xs text-sm text-wallet-muted">
        Billetera web en BNB Smart Chain. Conecta MetaMask, Trust Wallet u otra
        wallet compatible.
      </p>

      <div className="mt-10 w-full max-w-sm space-y-3">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            type="button"
            disabled={busy}
            onClick={() => connect({ connector })}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-wallet-accent py-4 text-base font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {busy ? "Conectando…" : `Conectar ${connector.name}`}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-400">{error.message}</p>
      )}

      <p className="mt-8 text-xs text-wallet-muted">
        Non-custodial · Tus claves, tus fondos
      </p>
    </div>
  );
}
