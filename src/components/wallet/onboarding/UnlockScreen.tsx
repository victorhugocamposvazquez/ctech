"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalWallet } from "@/contexts/LocalWalletContext";
import {
  isBiometricEnabled,
  isBiometricSupported,
  unlockWithBiometric,
} from "@/lib/wallet/biometrics";
import { loadKeystore } from "@/lib/wallet/keystore";
import { shortenAddress } from "@/lib/wallet/format";
import { WalletPickerSheet } from "../WalletPickerSheet";
import { TrustShield } from "../TrustShield";
import { t } from "@/lib/wallet/i18n";

export function UnlockScreen() {
  const {
    unlock,
    removeWallet,
    wallets,
    activeWalletId,
    switchWallet,
    startAddingWallet,
  } = useLocalWallet();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const autoBioTried = useRef(false);

  const activeMeta = wallets.find((w) => w.id === activeWalletId);
  const activeAddress = activeMeta?.address ?? loadKeystore()?.address;

  useEffect(() => {
    setPassword("");
    setError("");
    autoBioTried.current = false;
    void isBiometricSupported().then((ok) => {
      setBioAvailable(ok && isBiometricEnabled(activeAddress));
    });
  }, [activeWalletId, activeAddress]);

  const tryBiometric = async (auto = false) => {
    if (busy || !activeAddress) return;
    setError("");
    setBusy(true);
    try {
      const pwd = await unlockWithBiometric(activeAddress);
      await unlock(pwd);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg !== "Cancelled" && !auto) {
        setError(t.biometricFailed);
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!bioAvailable || autoBioTried.current) return;
    autoBioTried.current = true;
    void tryBiometric(true);
  }, [bioAvailable]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await unlock(password);
    } catch {
      setError(t.wrongPassword);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (confirm(`${t.resetWalletHint}\n\n${t.deleteActiveConfirm}`)) {
      removeWallet();
    }
  };

  const handleSelectWallet = (id: string) => {
    setShowPicker(false);
    if (id !== activeWalletId) switchWallet(id);
  };

  const handleAddWallet = () => {
    setShowPicker(false);
    startAddingWallet();
  };

  return (
    <>
      <div className="wallet-screen wallet-gradient-top wallet-screen-centered min-h-dvh pb-28 pt-16">
        <div className="wallet-hero-glow">
          <TrustShield className="relative mx-auto h-24 w-24" />
        </div>
        <h1 className="mt-8 text-[28px] font-bold text-wallet-text">{t.welcomeBack}</h1>
        {activeMeta && (
          <p className="mt-2 text-sm font-medium text-wallet-text">{activeMeta.label}</p>
        )}
        {activeAddress && (
          <p className="mt-1 font-mono text-xs text-wallet-muted">
            {shortenAddress(activeAddress, 8)}
          </p>
        )}
        <p className="mt-2 text-wallet-muted">{t.unlockHint}</p>

        {bioAvailable && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void tryBiometric()}
            className="wallet-btn-biometric mt-8 max-w-sm"
          >
            <svg className="h-6 w-6 text-wallet-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 11V9a7 7 0 1114 0v2M12 14v4M8 18h8" />
            </svg>
            {busy ? t.unlocking : t.unlockBiometric}
          </button>
        )}

        <form onSubmit={(e) => void submit(e)} className="mt-6 w-full max-w-sm space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.password}
            autoFocus={!bioAvailable}
            className="wallet-input text-center"
          />
          {error && <p className="text-center text-sm text-wallet-danger">{error}</p>}
          <button type="submit" disabled={busy || !password} className="wallet-btn-primary">
            {busy ? t.unlocking : t.unlock}
          </button>
        </form>

        {wallets.length > 1 && (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="mt-6 text-sm font-semibold text-wallet-accent"
          >
            {t.useAnotherWallet}
          </button>
        )}

        <button
          type="button"
          onClick={handleAddWallet}
          className={`text-sm font-semibold text-wallet-accent ${wallets.length > 1 ? "mt-3" : "mt-6"}`}
        >
          {t.addWallet}
        </button>

        <button
          type="button"
          onClick={() => setShowReset((v) => !v)}
          className="mt-4 text-sm text-wallet-muted-dim"
        >
          {t.forgotPassword}
        </button>

        {showReset && (
          <div className="mt-4 w-full max-w-sm rounded-2xl border border-wallet-border bg-wallet-card p-4 text-left">
            <p className="text-sm leading-relaxed text-wallet-muted">{t.resetWalletHint}</p>
            <button type="button" onClick={reset} className="wallet-btn-danger mt-4">
              {t.resetWallet}
            </button>
          </div>
        )}
      </div>

      <WalletPickerSheet
        open={showPicker}
        wallets={wallets}
        activeId={activeWalletId}
        onSelect={handleSelectWallet}
        onAdd={handleAddWallet}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
}
