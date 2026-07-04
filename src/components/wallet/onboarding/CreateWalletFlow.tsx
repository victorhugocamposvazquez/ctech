"use client";

import { useMemo, useState } from "react";
import { english, generateMnemonic } from "viem/accounts";
import { useLocalWallet } from "@/contexts/LocalWalletContext";
import { WalletAuthScreen } from "../WalletAuthScreen";
import { t } from "@/lib/wallet/i18n";

interface CreateWalletFlowProps {
  onBack: () => void;
}

type Step = "password" | "phrase" | "verify";

interface QuizItem {
  index: number;
  options: string[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuiz(words: string[]): QuizItem[] {
  const indices = shuffle(words.map((_, i) => i)).slice(0, 2);
  return indices.map((index) => {
    const decoys = words.filter((_, i) => i !== index);
    const options = shuffle([words[index], ...shuffle(decoys).slice(0, 3)]);
    return { index, options };
  });
}

export function CreateWalletFlow({ onBack }: CreateWalletFlowProps) {
  const { importWallet } = useLocalWallet();
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
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
    const w = m.split(" ");
    setWords(w);
    setQuiz(buildQuiz(w));
    setAnswers({});
    setStep("phrase");
  };

  const goToVerify = () => {
    if (!saved) return;
    setStep("verify");
  };

  const allAnswered = useMemo(
    () => quiz.every((q) => answers[q.index] === words[q.index]),
    [quiz, answers, words]
  );

  const finalize = async () => {
    if (!quiz.every((q) => answers[q.index] === words[q.index])) {
      setError(t.verifyWrong);
      return;
    }
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
      <WalletAuthScreen
        centered={false}
        topBar={
          <button type="button" onClick={onBack} className="wallet-back-link">
            ← {t.back}
          </button>
        }
      >
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
        <button type="button" onClick={goToPhrase} className="wallet-btn-primary mt-8">
          {t.continue}
        </button>
      </WalletAuthScreen>
    );
  }

  if (step === "phrase") {
    return (
      <WalletAuthScreen centered={false}>
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

        <button type="button" disabled={!saved} onClick={goToVerify} className="wallet-btn-primary mt-6">
          {t.continue}
        </button>
      </WalletAuthScreen>
    );
  }

  return (
    <WalletAuthScreen centered={false}>
      <h1 className="wallet-page-title">{t.verifyPhrase}</h1>
      <p className="wallet-page-subtitle">{t.verifyPhraseHint}</p>

      <div className="mt-8 space-y-6">
        {quiz.map((q) => (
          <div key={q.index}>
            <p className="wallet-label">
              {t.wordNumber} #{q.index + 1}
            </p>
            <div className="wallet-mnemonic-grid mt-2 wallet-mnemonic-grid--verify">
              {q.options.map((opt) => {
                const selected = answers[q.index] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setAnswers((a) => ({ ...a, [q.index]: opt }))}
                    className={`wallet-mnemonic-word wallet-mnemonic-word--selectable ${
                      selected ? "wallet-mnemonic-word--selected" : ""
                    }`}
                  >
                    <span className="wallet-mnemonic-text">{opt}</span>
                    {selected && (
                      <span className="wallet-mnemonic-check" aria-hidden="true">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-wallet-danger">{error}</p>}

      <button
        type="button"
        disabled={!allAnswered || busy}
        onClick={() => void finalize()}
        className="wallet-btn-primary mt-8"
      >
        {busy ? t.creating : t.verifyContinue}
      </button>
    </WalletAuthScreen>
  );
}
