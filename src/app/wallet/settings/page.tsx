"use client";

import { useAccount, useDisconnect, useConnect } from "wagmi";
import { WalletShell } from "@/components/wallet/WalletShell";
import { shortenAddress } from "@/lib/wallet/format";
import { walletChain } from "@/lib/wallet/config";
import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";
import { TrustShield } from "@/components/wallet/TrustShield";

export default function WalletSettingsPage() {
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();
  const { showInstallBanner, canNativeInstall, install, isStandalone, isIOS } =
    useInstallPrompt();

  return (
    <WalletShell hideNav>
      <div className="px-4 pt-4">
        <div className="mb-8 flex flex-col items-center pt-4">
          <TrustShield className="h-14 w-14" />
          <p className="mt-3 text-lg font-bold text-wallet-text">Trust Wallet</p>
          <p className="text-sm text-wallet-muted">Web App · v1.0</p>
        </div>

        <div className="space-y-3">
          <section className="overflow-hidden rounded-2xl bg-wallet-elevated">
            <div className="border-b border-wallet-border px-4 py-3.5">
              <p className="text-xs font-medium uppercase tracking-wide text-wallet-muted">
                Network
              </p>
              <p className="mt-1 font-semibold text-wallet-text">{walletChain.name}</p>
            </div>
            {isConnected && address && (
              <div className="px-4 py-3.5">
                <p className="text-xs font-medium uppercase tracking-wide text-wallet-muted">
                  Wallet address
                </p>
                <p className="mt-1 break-all font-mono text-sm text-wallet-secondary">
                  {shortenAddress(address, 10)}
                </p>
                <p className="mt-0.5 text-xs text-wallet-muted">
                  {connector?.name ?? "Injected"}
                </p>
              </div>
            )}
          </section>

          {showInstallBanner && (
            <button
              type="button"
              onClick={() => void install()}
              disabled={!canNativeInstall && !isIOS}
              className="wallet-btn-primary disabled:opacity-50"
            >
              {canNativeInstall
                ? "Install App"
                : isIOS
                  ? "Install (see banner below)"
                  : "Install App"}
            </button>
          )}

          {isStandalone && (
            <p className="text-center text-sm text-wallet-accent">
              ✓ Installed as app
            </p>
          )}

          {isConnected ? (
            <button
              type="button"
              onClick={() => disconnect()}
              className="w-full rounded-full border border-wallet-danger/40 py-4 text-sm font-semibold text-wallet-danger"
            >
              Disconnect Wallet
            </button>
          ) : (
            <div className="space-y-2">
              {connectors.map((c) => (
                <button
                  key={c.uid}
                  type="button"
                  onClick={() => connect({ connector: c })}
                  className="wallet-btn-primary"
                >
                  Connect {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="mt-10 pb-8 text-center text-xs leading-relaxed text-wallet-muted-dim">
          Non-custodial wallet. Your keys remain in your browser extension.
        </p>
      </div>
    </WalletShell>
  );
}
