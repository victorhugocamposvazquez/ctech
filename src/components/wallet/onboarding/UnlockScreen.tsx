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
import {
  useAllowAutoBiometric,
  WalletPasswordInput,
} from "../WalletPasswordInput";
import { TrustShield } from "../TrustShield";
import { WalletAuthScreen } from "../WalletAuthScreen";
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
  const passwordRef = useRef<HTMLInputElement>(null);
  const allowAutoBio = useAllowAutoBiometric();

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
      if (auto || msg === "Cancelled") {
        passwordRef.current?.focus();
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!allowAutoBio || !bioAvailable || autoBioTried.current) return;
    autoBioTried.current = true;
    void tryBiometric(true);
  }, [allowAutoBio, bioAvailable]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await unlock(password);
    } catch {
      setError(t.wrongPassword);
      passwordRef.current?.focus();
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
      <WalletAuthScreen centered>
        <div className="wallet-hero-glow flex flex-col items-center text-center">
          <TrustShield className="relative h-24 w-24" />
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
        </div>

        {bioAvailable && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void tryBiometric()}
            className="wallet-btn-biometric mt-8 w-full"
          >
            <svg className="h-6 w-6 text-wallet-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 11V9a7 7 0 1114 0v2M12 14v4M8 18h8" />
            </svg>
            {busy ? t.unlocking : t.unlockBiometric}
          </button>
        )}

        <form onSubmit={(e) => void submit(e)} className="relative z-10 mt-6 w-full space-y-4">
          <WalletPasswordInput
            inputRef={passwordRef}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.password}
            aria-label={t.password}
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
            className="mt-6 w-full text-sm font-semibold text-wallet-accent"
          >
            {t.useAnotherWallet}
          </button>
        )}

        <button
          type="button"
          onClick={handleAddWallet}
          className={`w-full text-sm font-semibold text-wallet-accent ${wallets.length > 1 ? "mt-3" : "mt-6"}`}
        >
          {t.addWallet}
        </button>

        <button
          type="button"
          onClick={() => setShowReset((v) => !v)}
          className="mt-4 w-full text-sm text-wallet-muted-dim"
        >
          {t.forgotPassword}
        </button>

        {showReset && (
          <div className="mt-4 rounded-2xl border border-wallet-border bg-wallet-card p-4 text-left">
            <p className="text-sm leading-relaxed text-wallet-muted">{t.resetWalletHint}</p>
            <button type="button" onClick={reset} className="wallet-btn-danger mt-4">
              {t.resetWallet}
            </button>
          </div>
        )}
      </WalletAuthScreen>

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
