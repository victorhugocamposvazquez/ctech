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
      <div className="flex min-h-dvh flex-col px-5 pb-8 pt-6">
        <button type="button" onClick={onBack} className="mb-4 text-sm text-wallet-accent">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-wallet-text">Create password</h1>
        <p className="mt-2 text-sm text-wallet-muted">
          This password encrypts your wallet on this device. It cannot be recovered.
        </p>

        <div className="mt-8 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="wallet-input"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            className="wallet-input"
          />
        </div>

        {error && <p className="mt-4 text-sm text-wallet-danger">{error}</p>}

        <button type="button" onClick={goToPhrase} className="wallet-btn-primary mt-auto">
          Continue
        </button>
      </div>
    );
  }

  if (step === "phrase") {
    return (
      <div className="flex min-h-dvh flex-col px-5 pb-8 pt-6">
        <h1 className="text-2xl font-bold text-wallet-text">Secret phrase</h1>
        <p className="mt-2 text-sm text-wallet-muted">
          Write down these 12 words in order. Never share them with anyone.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {words.map((word, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl bg-wallet-elevated px-3 py-2.5"
            >
              <span className="text-xs text-wallet-muted">{i + 1}</span>
              <span className="font-mono text-sm text-wallet-text">{word}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(mnemonic)}
          className="mt-4 text-sm font-semibold text-wallet-accent"
        >
          Copy to clipboard
        </button>

        <label className="mt-6 flex items-start gap-3 text-sm text-wallet-secondary">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="mt-1 accent-[#48ff91]"
          />
          I have saved my secret phrase in a secure place
        </label>

        {error && <p className="mt-4 text-sm text-wallet-danger">{error}</p>}

        <button
          type="button"
          disabled={!saved || busy}
          onClick={() => void finalize()}
          className="wallet-btn-primary mt-6"
        >
          {busy ? "Saving…" : "Continue"}
        </button>
      </div>
    );
  }

  return null;
}
