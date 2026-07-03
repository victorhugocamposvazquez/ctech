"use client";

import { useState } from "react";
import { english, generateMnemonic } from "viem/accounts";
import { useLocalWallet } from "@/contexts/LocalWalletContext";

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
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
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
      setError("Could not save wallet");
    } finally {
      setBusy(false);
    }
  };

  if (step === "password") {
    return (
      <div className="wallet-screen wallet-gradient-top min-h-dvh pt-8">
        <button type="button" onClick={onBack} className="wallet-back-link">
          ← Back
        </button>
        <h1 className="wallet-page-title">Create password</h1>
        <p className="wallet-page-subtitle">
          Encrypts your wallet on this device. Cannot be recovered if lost.
        </p>

        <div className="mt-10 space-y-5">
          <div>
            <label className="wallet-label">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="wallet-input" placeholder="Min. 8 characters" />
          </div>
          <div>
            <label className="wallet-label">Confirm</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="wallet-input" />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-wallet-danger">{error}</p>}
        <button type="button" onClick={goToPhrase} className="wallet-btn-primary mt-auto">
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-screen wallet-gradient-top min-h-dvh pt-8">
      <h1 className="wallet-page-title">Secret phrase</h1>
      <p className="wallet-page-subtitle">
        Write down these 12 words in order. This is the only way to recover your wallet.
      </p>

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
        Copy to clipboard
      </button>

      <label className="mt-8 flex items-start gap-3 rounded-2xl border border-wallet-border bg-wallet-accent-soft p-4 text-sm text-wallet-secondary">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 accent-[#48ff91]" />
        I have saved my secret phrase in a secure place
      </label>

      {error && <p className="mt-4 text-sm text-wallet-danger">{error}</p>}

      <button type="button" disabled={!saved || busy} onClick={() => void finalize()} className="wallet-btn-primary mt-6">
        {busy ? "Creating wallet…" : "Continue to wallet"}
      </button>
    </div>
  );
}
