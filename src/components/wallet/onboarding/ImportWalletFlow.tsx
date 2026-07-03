"use client";

import { useState } from "react";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { useLocalWallet } from "@/contexts/LocalWalletContext";
import type { SecretPayload } from "@/lib/wallet/keystore";
import { t } from "@/lib/wallet/i18n";

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
      setError(t.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      setError(t.passwordsMismatch);
      return;
    }

    let payload: SecretPayload;
    if (tab === "phrase") {
      const normalized = normalizeMnemonic(phrase);
      if (!validateMnemonic(normalized)) {
        setError(t.invalidPhrase);
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
        setError(t.invalidKey);
        return;
      }
    }

    setBusy(true);
    try {
      await importWallet(payload, password);
    } catch {
      setError(t.couldNotImport);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wallet-screen wallet-gradient-top min-h-dvh pb-28 pt-8">
      <button type="button" onClick={onBack} className="wallet-back-link">
        ← {t.back}
      </button>
      <h1 className="wallet-page-title">{t.importTitle}</h1>
      <p className="wallet-page-subtitle">{t.importHint}</p>

      <div className="wallet-segmented mt-8">
        {(["phrase", "key"] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`wallet-segmented-btn ${tab === tabKey ? "active" : ""}`}
          >
            {tabKey === "phrase" ? t.secretPhraseTab : t.privateKeyTab}
          </button>
        ))}
      </div>

      <div className="mt-6 flex-1 space-y-5">
        {tab === "phrase" ? (
          <div>
            <label className="wallet-label">{t.recoveryPhrase}</label>
            <textarea
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="palabra1 palabra2 palabra3 …"
              rows={4}
              className="wallet-input resize-none font-mono text-sm leading-relaxed"
            />
          </div>
        ) : (
          <div>
            <label className="wallet-label">{t.privateKey}</label>
            <input
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="0x…"
              className="wallet-input font-mono text-sm"
            />
          </div>
        )}

        <div>
          <label className="wallet-label">{t.newPassword}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="wallet-input" />
        </div>
        <div>
          <label className="wallet-label">{t.confirmPassword}</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="wallet-input" />
        </div>
      </div>

      {error && <p className="text-sm text-wallet-danger">{error}</p>}

      <button type="button" disabled={busy} onClick={() => void submit()} className="wallet-btn-primary mt-6">
        {busy ? t.importing : t.importWallet}
      </button>
    </div>
  );
}
