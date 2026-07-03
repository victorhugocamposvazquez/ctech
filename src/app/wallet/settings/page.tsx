"use client";

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
  const { showInstallBanner, canNativeInstall, install, isStandalone, isIOS } =
    useInstallPrompt();

  return (
    <WalletShell hideNav gradient>
      <div className="wallet-screen pt-2">
        <div className="wallet-hero-glow mb-8 flex flex-col items-center pt-2">
          <TrustShield className="relative h-16 w-16" />
          <p className="mt-4 text-xl font-bold text-wallet-text">Trust Wallet</p>
          <p className="text-sm text-wallet-muted">Web App · v1.0</p>
        </div>

        <div className="space-y-4">
          <section className="wallet-settings-group">
            <div className="wallet-settings-row">
              <p className="wallet-settings-label">Network</p>
              <p className="mt-1.5 text-[16px] font-semibold text-wallet-text">{walletChain.name}</p>
            </div>
            {address && (
              <div className="wallet-settings-row">
                <p className="wallet-settings-label">Wallet</p>
                <p className="mt-1.5 text-[16px] font-semibold text-wallet-text">
                  {mode === "local" ? "Main Wallet (local)" : "Connected wallet"}
                </p>
                <p className="mt-1 font-mono text-sm text-wallet-muted">{shortenAddress(address, 10)}</p>
              </div>
            )}
          </section>

          {mode === "local" && (
            <button type="button" onClick={() => lock()} className="wallet-btn-secondary">
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
            <p className="text-center text-sm font-medium text-wallet-accent">✓ Installed as app</p>
          )}

          <button type="button" onClick={() => disconnectAll()} className="wallet-btn-secondary">
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
              className="wallet-btn-danger"
            >
              Delete local wallet
            </button>
          )}
        </div>

        <p className="mt-10 pb-6 text-center text-xs leading-relaxed text-wallet-muted-dim">
          Local wallets are encrypted on this device. Never share your secret phrase.
        </p>
      </div>
    </WalletShell>
  );
}
