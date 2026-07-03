"use client";

import { useState } from "react";
import { useLocalWallet } from "@/contexts/LocalWalletContext";
import { TrustShield } from "../TrustShield";
import { t } from "@/lib/wallet/i18n";

export function UnlockScreen() {
  const { unlock, removeWallet } = useLocalWallet();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);

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
    if (
      confirm(
        `${t.resetWalletHint}\n\n${t.deleteConfirm}`
      )
    ) {
      removeWallet();
    }
  };

  return (
    <div className="wallet-screen wallet-gradient-top wallet-screen-centered min-h-dvh pb-28 pt-16">
      <div className="wallet-hero-glow">
        <TrustShield className="relative mx-auto h-24 w-24" />
      </div>
      <h1 className="mt-8 text-[28px] font-bold text-wallet-text">{t.welcomeBack}</h1>
      <p className="mt-2 text-wallet-muted">{t.unlockHint}</p>

      <form onSubmit={(e) => void submit(e)} className="mt-10 w-full max-w-sm space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.password}
          autoFocus
          className="wallet-input text-center"
        />
        {error && <p className="text-center text-sm text-wallet-danger">{error}</p>}
        <button type="submit" disabled={busy || !password} className="wallet-btn-primary">
          {busy ? t.unlocking : t.unlock}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setShowReset((v) => !v)}
        className="mt-6 text-sm font-semibold text-wallet-accent"
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
  );
}
