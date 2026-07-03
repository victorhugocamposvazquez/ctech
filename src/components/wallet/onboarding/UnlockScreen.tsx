"use client";

import { useState } from "react";
import { useLocalWallet } from "@/contexts/LocalWalletContext";
import { TrustShield } from "../TrustShield";

export function UnlockScreen() {
  const { unlock } = useLocalWallet();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await unlock(password);
    } catch {
      setError("Incorrect password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wallet-screen wallet-gradient-top wallet-screen-centered min-h-dvh pt-16">
      <div className="wallet-hero-glow">
        <TrustShield className="relative mx-auto h-24 w-24" />
      </div>
      <h1 className="mt-8 text-[28px] font-bold text-wallet-text">Welcome back</h1>
      <p className="mt-2 text-wallet-muted">Enter your password to unlock</p>

      <form onSubmit={(e) => void submit(e)} className="mt-10 w-full max-w-sm space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="wallet-input text-center"
        />
        {error && <p className="text-center text-sm text-wallet-danger">{error}</p>}
        <button type="submit" disabled={busy || !password} className="wallet-btn-primary">
          {busy ? "Unlocking…" : "Unlock wallet"}
        </button>
      </form>
    </div>
  );
}
