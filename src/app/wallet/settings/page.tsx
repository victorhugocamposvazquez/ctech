"use client";

import { useAccount, useDisconnect, useConnect } from "wagmi";
import { WalletShell } from "@/components/wallet/WalletShell";
import { shortenAddress } from "@/lib/wallet/format";
import { walletChain } from "@/lib/wallet/config";
import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";

export default function WalletSettingsPage() {
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();
  const { canInstall, install, isStandalone } = useInstallPrompt();

  return (
    <WalletShell title="Ajustes">
      <div className="space-y-4 px-4 pt-4">
        <section className="rounded-2xl bg-wallet-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-wallet-muted">
            Red
          </h2>
          <p className="mt-2 font-medium text-wallet-text">{walletChain.name}</p>
          <p className="text-xs text-wallet-muted">Chain ID {walletChain.id}</p>
        </section>

        {isConnected && address && (
          <section className="rounded-2xl bg-wallet-card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-wallet-muted">
              Wallet conectada
            </h2>
            <p className="mt-2 font-mono text-sm text-wallet-text">
              {shortenAddress(address, 8)}
            </p>
            <p className="text-xs text-wallet-muted">
              {connector?.name ?? "Injected"}
            </p>
            <button
              type="button"
              onClick={() => disconnect()}
              className="mt-4 w-full rounded-xl border border-red-500/40 py-3 text-sm font-semibold text-red-400"
            >
              Desconectar
            </button>
          </section>
        )}

        {!isConnected && (
          <section className="rounded-2xl bg-wallet-card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-wallet-muted">
              Conectar
            </h2>
            <div className="mt-3 space-y-2">
              {connectors.map((c) => (
                <button
                  key={c.uid}
                  type="button"
                  onClick={() => connect({ connector: c })}
                  className="w-full rounded-xl bg-wallet-accent py-3 text-sm font-semibold text-white"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {canInstall && !isStandalone && (
          <section className="rounded-2xl bg-wallet-card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-wallet-muted">
              Instalar app
            </h2>
            <p className="mt-2 text-sm text-wallet-muted">
              Añade la billetera a tu pantalla de inicio (PWA).
            </p>
            <button
              type="button"
              onClick={() => void install()}
              className="mt-4 w-full rounded-xl bg-wallet-accent py-3 text-sm font-semibold text-white"
            >
              Instalar
            </button>
          </section>
        )}

        {isStandalone && (
          <p className="text-center text-xs text-green-400">
            ✓ App instalada en modo standalone
          </p>
        )}

        <section className="rounded-2xl bg-wallet-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-wallet-muted">
            Acerca de
          </h2>
          <p className="mt-2 text-sm text-wallet-muted">
            Billetera web non-custodial. Tus claves permanecen en tu wallet
            (MetaMask, Trust Wallet, etc.).
          </p>
        </section>
      </div>
    </WalletShell>
  );
}
