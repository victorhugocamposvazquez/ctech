"use client";

import { useConnect } from "wagmi";
import { useLocalWallet } from "@/contexts/LocalWalletContext";
import { useWalletSession } from "@/hooks/wallet/useWalletSession";
import { WalletShell } from "@/components/wallet/WalletShell";
import { shortenAddress } from "@/lib/wallet/format";
import { walletChain } from "@/lib/wallet/config";
import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";
import { TrustShield } from "@/components/wallet/TrustShield";

export default function WalletSettingsPage() {
  const { address, mode, disconnectAll, deleteLocalWallet } = useWalletSession();
  const { lock } = useLocalWallet();
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
            {address && (
              <div className="px-4 py-3.5">
                <p className="text-xs font-medium uppercase tracking-wide text-wallet-muted">
                  Wallet
                </p>
                <p className="mt-1 font-semibold text-wallet-text">
                  {mode === "local" ? "Main Wallet (local)" : "Connected wallet"}
                </p>
                <p className="mt-1 break-all font-mono text-sm text-wallet-secondary">
                  {shortenAddress(address, 10)}
                </p>
              </div>
            )}
          </section>

          {mode === "local" && (
            <button
              type="button"
              onClick={() => lock()}
              className="w-full rounded-full border border-wallet-border py-4 text-sm font-semibold text-wallet-text"
            >
              Lock wallet
            </button>
          )}

          {showInstallBanner && (
            <button
              type="button"
              onClick={() => void install()}
              disabled={!canNativeInstall && !isIOS}
              className="wallet-btn-primary disabled:opacity-50"
            >
              Install App
            </button>
          )}

          {isStandalone && (
            <p className="text-center text-sm text-wallet-accent">✓ Installed as app</p>
          )}

          <button
            type="button"
            onClick={() => disconnectAll()}
            className="w-full rounded-full border border-wallet-border py-4 text-sm font-semibold text-wallet-text"
          >
            Disconnect
          </button>

          {mode === "local" && (
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    "Delete wallet from this device? Make sure you have your secret phrase saved."
                  )
                ) {
                  deleteLocalWallet();
                }
              }}
              className="w-full rounded-full border border-wallet-danger/40 py-4 text-sm font-semibold text-wallet-danger"
            >
              Delete local wallet
            </button>
          )}

          {mode === "external" && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-wallet-muted">Switch to local wallet</p>
              {connectors.map((c) => (
                <button
                  key={c.uid}
                  type="button"
                  disabled
                  className="w-full rounded-full border border-wallet-border py-3 text-sm text-wallet-muted opacity-50"
                >
                  Disconnect {c.name} first
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="mt-10 pb-8 text-center text-xs leading-relaxed text-wallet-muted-dim">
          Local wallets are encrypted on this device. Never share your secret phrase.
        </p>
      </div>
    </WalletShell>
  );
}
