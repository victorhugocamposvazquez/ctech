"use client";

import { useEffect, useState } from "react";
import { decryptSecret, loadKeystore } from "@/lib/wallet/keystore";
import {
  clearBiometricEnrollment,
  enrollBiometric,
  isBiometricEnabled,
  isBiometricSupported,
} from "@/lib/wallet/biometrics";
import { t } from "@/lib/wallet/i18n";

export function BiometricSettings() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    void isBiometricSupported().then(setSupported);
    setEnabled(isBiometricEnabled());
  }, []);

  const disable = () => {
    clearBiometricEnrollment();
    setEnabled(false);
    setError("");
  };

  const enable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const store = loadKeystore();
      if (!store) throw new Error("No wallet");
      await decryptSecret(store, password);
      await enrollBiometric(password);
      setEnabled(true);
      setShowPassword(false);
      setPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "PRF not supported") {
        setError(t.biometricUnsupported);
      } else if (msg === "Cancelled") {
        setError(t.biometricCancelled);
      } else {
        setError(t.wrongPassword);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  return (
    <section className="wallet-settings-group">
      <div className="wallet-settings-row">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="wallet-settings-label">{t.biometric}</p>
            <p className="mt-1 text-sm text-wallet-muted">{t.biometricHint}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={busy}
            onClick={() => {
              if (enabled) disable();
              else setShowPassword(true);
            }}
            className={`wallet-toggle ${enabled ? "on" : ""}`}
          >
            <span className="wallet-toggle-knob" />
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-wallet-danger">{error}</p>}

        {showPassword && !enabled && (
          <form onSubmit={(e) => void enable(e)} className="mt-4 space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.password}
              className="wallet-input"
              autoFocus
            />
            <div className="wallet-cta-row !mt-0">
              <button
                type="button"
                onClick={() => {
                  setShowPassword(false);
                  setPassword("");
                  setError("");
                }}
                className="wallet-btn-secondary"
              >
                {t.cancel}
              </button>
              <button type="submit" disabled={busy || !password} className="wallet-btn-primary">
                {busy ? t.enablingBiometric : t.enableBiometric}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
