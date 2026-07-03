"use client";

import { useState } from "react";
import { useLocalWallet } from "@/contexts/LocalWalletContext";
import { useWalletSession } from "@/hooks/wallet/useWalletSession";
import { WalletShell } from "@/components/wallet/WalletShell";
import { shortenAddress } from "@/lib/wallet/format";
import { walletChain } from "@/lib/wallet/config";
import { useInstallPrompt } from "@/hooks/wallet/useInstallPrompt";
import { TrustShield } from "@/components/wallet/TrustShield";
import { AutoLockSettings } from "@/components/wallet/AutoLockSettings";
import { ThemeSettings } from "@/components/wallet/ThemeSettings";
import { BiometricSettings } from "@/components/wallet/BiometricSettings";
import { WalletsSettings } from "@/components/wallet/WalletsSettings";
import { t } from "@/lib/wallet/i18n";

export default function WalletSettingsPage() {
  const { address, mode, disconnectAll, deleteLocalWallet, deleteAllLocalWallets, wallets } = useWalletSession();
  const { lock } = useLocalWallet();
  const { install, isStandalone } = useInstallPrompt();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <WalletShell hideNav gradient>
      <div className="wallet-screen pt-2">
        <div className="wallet-hero-glow mb-8 flex flex-col items-center pt-2">
          <TrustShield className="relative h-16 w-16" />
          <p className="mt-4 text-xl font-bold text-wallet-text">{t.appName}</p>
          <p className="text-sm text-wallet-muted">{t.version}</p>
        </div>

        <div className="space-y-4">
          <section className="wallet-settings-group">
            <div className="wallet-settings-row">
              <p className="wallet-settings-label">{t.network}</p>
              <p className="mt-1.5 text-[16px] font-semibold text-wallet-text">{walletChain.name}</p>
            </div>
            {address && (
              <div className="wallet-settings-row">
                <p className="wallet-settings-label">{t.walletLabel}</p>
                <p className="mt-1.5 text-[16px] font-semibold text-wallet-text">
                  {mode === "local" ? t.walletLocal : t.walletExternal}
                </p>
                <p className="mt-1 font-mono text-sm text-wallet-muted">{shortenAddress(address, 10)}</p>
                <button
                  type="button"
                  onClick={() => void copyAddress()}
                  className="mt-2 text-sm font-semibold text-wallet-accent"
                >
                  {copied ? t.copied : t.copyAddress}
                </button>
              </div>
            )}
          </section>

          {mode === "local" && <WalletsSettings />}

          {mode === "local" && <AutoLockSettings />}

          {mode === "local" && <BiometricSettings />}

          <ThemeSettings />

          {mode === "local" && (
            <button type="button" onClick={() => lock()} className="wallet-btn-secondary">
              {t.lockWallet}
            </button>
          )}

          {!isStandalone && (
            <button type="button" onClick={install} className="wallet-btn-primary">
              {t.installApp}
            </button>
          )}

          {isStandalone && (
            <p className="text-center text-sm font-medium text-wallet-accent">{t.installedApp}</p>
          )}

          <button type="button" onClick={() => disconnectAll()} className="wallet-btn-secondary">
            {t.disconnect}
          </button>

          {mode === "local" && wallets.length === 1 && (
            <button
              type="button"
              onClick={() => {
                if (confirm(t.deleteConfirm)) deleteLocalWallet();
              }}
              className="wallet-btn-danger"
            >
              {t.deleteWallet}
            </button>
          )}

          {mode === "local" && wallets.length > 1 && (
            <button
              type="button"
              onClick={() => {
                if (confirm(t.deleteAllConfirm)) deleteAllLocalWallets();
              }}
              className="wallet-btn-danger"
            >
              {t.deleteWallet}
            </button>
          )}
        </div>

        <p className="mt-10 pb-6 text-center text-xs leading-relaxed text-wallet-muted-dim">
          {t.securityNote}
        </p>
      </div>
    </WalletShell>
  );
}
