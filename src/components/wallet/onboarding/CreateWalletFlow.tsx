"use client";

import { useState } from "react";
import { english, generateMnemonic } from "viem/accounts";
import { useLocalWallet } from "@/contexts/LocalWalletContext";
import { t } from "@/lib/wallet/i18n";

interface CreateWalletFlowProps {
  onBack: () => void;
}

type Step = "password" | "phrase";

export function CreateWalletFlow({ onBack }: CreateWalletFlowProps) {
  const { importWallet } = useLocalWallet();
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const goToPhrase = () => {
    setError("");
    if (password.length < 8) {
      setError(t.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      setError(t.passwordsMismatch);
      return;
    }
    const m = generateMnemonic(english);
    setMnemonic(m);
    setWords(m.split(" "));
    setStep("phrase");
  };

  const finalize = async () => {
    setBusy(true);
    setError("");
    try {
      await importWallet({ type: "mnemonic", value: mnemonic }, password);
    } catch {
      setError(t.couldNotSave);
    } finally {
      setBusy(false);
    }
  };

  if (step === "password") {
    return (
      <div className="wallet-screen wallet-gradient-top min-h-dvh pb-28 pt-8">
        <button type="button" onClick={onBack} className="wallet-back-link">
          ← {t.back}
        </button>
        <h1 className="wallet-page-title">{t.createPassword}</h1>
        <p className="wallet-page-subtitle">{t.createPasswordHint}</p>

        <div className="mt-10 space-y-5">
          <div>
            <label className="wallet-label">{t.password}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="wallet-input" placeholder={t.passwordMin} />
          </div>
          <div>
            <label className="wallet-label">{t.confirmPassword}</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="wallet-input" />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-wallet-danger">{error}</p>}
        <button type="button" onClick={goToPhrase} className="wallet-btn-primary mt-auto">
          {t.continue}
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-screen wallet-gradient-top min-h-dvh pb-28 pt-8">
      <h1 className="wallet-page-title">{t.secretPhrase}</h1>
      <p className="wallet-page-subtitle">{t.secretPhraseHint}</p>

      <div className="wallet-mnemonic-grid mt-8">
        {words.map((word, i) => (
          <div key={i} className="wallet-mnemonic-word">
            <span className="wallet-mnemonic-index">{i + 1}</span>
            <span className="wallet-mnemonic-text">{word}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void navigator.clipboard.writeText(mnemonic)}
        className="mt-5 text-sm font-semibold text-wallet-accent"
      >
        {t.copyPhrase}
      </button>

      <label className="mt-8 flex items-start gap-3 rounded-2xl border border-wallet-border bg-wallet-accent-soft p-4 text-sm text-wallet-secondary">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 accent-[#48ff91]" />
        {t.savedPhrase}
      </label>

      {error && <p className="mt-4 text-sm text-wallet-danger">{error}</p>}

      <button type="button" disabled={!saved || busy} onClick={() => void finalize()} className="wallet-btn-primary mt-6">
        {busy ? t.creating : t.continueToWallet}
      </button>
    </div>
  );
}
