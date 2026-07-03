"use client";

import { useState } from "react";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { useLocalWallet } from "@/contexts/LocalWalletContext";
import type { SecretPayload } from "@/lib/wallet/keystore";

function normalizeMnemonic(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function validateMnemonic(words: string): boolean {
  const list = words.split(" ");
  if (![12, 15, 18, 21, 24].includes(list.length)) return false;
  try {
    mnemonicToAccount(words);
    return true;
  } catch {
    return false;
  }
}

interface ImportWalletFlowProps {
  onBack: () => void;
}

export function ImportWalletFlow({ onBack }: ImportWalletFlowProps) {
  const { importWallet } = useLocalWallet();
  const [tab, setTab] = useState<"phrase" | "key">("phrase");
  const [phrase, setPhrase] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    let payload: SecretPayload;
    if (tab === "phrase") {
      const normalized = normalizeMnemonic(phrase);
      if (!validateMnemonic(normalized)) {
        setError("Invalid recovery phrase");
        return;
      }
      payload = { type: "mnemonic", value: normalized };
    } else {
      const key = privateKey.trim();
      try {
        const k = key.startsWith("0x") ? key : `0x${key}`;
        privateKeyToAccount(k as `0x${string}`);
        payload = { type: "privateKey", value: k };
      } catch {
        setError("Invalid private key");
        return;
      }
    }

    setBusy(true);
    try {
      await importWallet(payload, password);
    } catch {
      setError("Could not import wallet");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-8 pt-6">
      <button type="button" onClick={onBack} className="mb-4 text-sm text-wallet-accent">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-wallet-text">Import wallet</h1>
      <p className="mt-2 text-sm text-wallet-muted">
        Restore with your 12-word phrase or private key
      </p>

      <div className="mt-6 flex rounded-full bg-wallet-elevated p-1">
        {(["phrase", "key"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition ${
              tab === t
                ? "bg-wallet-accent text-[#0b0b0c]"
                : "text-wallet-muted"
            }`}
          >
            {t === "phrase" ? "Secret phrase" : "Private key"}
          </button>
        ))}
      </div>

      <div className="mt-5 flex-1 space-y-4">
        {tab === "phrase" ? (
          <textarea
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="Enter your 12 or 24 word recovery phrase…"
            rows={4}
            className="wallet-input resize-none font-mono text-sm"
          />
        ) : (
          <input
            type="password"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="0x…"
            className="wallet-input font-mono text-sm"
          />
        )}

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-wallet-muted">
            New password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="wallet-input"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-wallet-muted">
            Confirm password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="wallet-input"
          />
        </div>
      </div>

      {error && <p className="text-sm text-wallet-danger">{error}</p>}

      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="wallet-btn-primary mt-4"
      >
        {busy ? "Importing…" : "Import wallet"}
      </button>
    </div>
  );
}
