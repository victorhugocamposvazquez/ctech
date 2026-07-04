"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ManagedTokenRecord } from "@/lib/wallet/managed-tokens";
import type { RegisteredWalletRow } from "./WalletAddressesSection";

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletSendSection() {
  const [wallets, setWallets] = useState<RegisteredWalletRow[]>([]);
  const [tokens, setTokens] = useState<ManagedTokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletId, setWalletId] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    symbol: string;
    amount: string;
    wallet: string;
  } | null>(null);

  const activeTokens = useMemo(
    () => tokens.filter((t) => t.is_active),
    [tokens]
  );
  const selectedWallet = wallets.find((w) => w.id === walletId);
  const selectedToken = activeTokens.find((t) => t.id === tokenId);

  const canSubmit =
    selectedWallet &&
    selectedToken &&
    amount.trim() &&
    !Number.isNaN(Number(amount)) &&
    Number(amount) > 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wRes, tRes] = await Promise.all([
        fetch("/api/backoffice/wallet-addresses"),
        fetch("/api/backoffice/wallet-tokens"),
      ]);
      const wJson = await wRes.json();
      const tJson = await tRes.json();
      if (!wRes.ok) throw new Error(wJson.error ?? "Error al cargar wallets");
      if (!tRes.ok) throw new Error(tJson.error ?? "Error al cargar tokens");

      setWallets(wJson.wallets ?? []);
      setTokens(tJson.tokens ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!walletId && wallets[0]) setWalletId(wallets[0].id);
  }, [wallets, walletId]);

  useEffect(() => {
    const firstActive = activeTokens[0];
    if (!tokenId && firstActive) setTokenId(firstActive.id);
  }, [activeTokens, tokenId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet || !selectedToken || !canSubmit) return;

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/backoffice/wallet-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: selectedWallet.wallet_address,
          token_id: selectedToken.id,
          amount: amount.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al acreditar");

      setSuccess({
        symbol: selectedToken.symbol,
        amount: amount.trim(),
        wallet: selectedWallet.label || shorten(selectedWallet.wallet_address),
      });
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0b1230]/80 p-8 text-center text-sm text-slate-400">
        Cargando envío…
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0b1230]/80 p-8 text-center space-y-2">
        <h2 className="text-lg font-semibold text-white">Enviar tokens (simulado)</h2>
        <p className="text-sm text-slate-400">
          Registra al menos una wallet destino arriba para acreditar tokens.
        </p>
      </div>
    );
  }

  if (activeTokens.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0b1230]/80 p-8 text-center space-y-2">
        <h2 className="text-lg font-semibold text-white">Enviar tokens (simulado)</h2>
        <p className="text-sm text-slate-400">
          Activa al menos un token BEP-20 en la tabla de arriba.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Enviar tokens (simulado)</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Acredita cualquier token y cantidad a una wallet registrada sin conectar
          MetaMask ni enviar on-chain. El saldo y el total en la app se actualizan al
          instante y el usuario recibe la notificación de ingreso.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100 space-y-1">
          <p className="font-medium">
            +{success.amount} {success.symbol} acreditados en {success.wallet}
          </p>
          <p className="text-xs text-emerald-200/80">
            La wallet verá el saldo actualizado y la notificación en la app (si está
            abierta, en unos segundos).
          </p>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="mt-2 rounded-lg border border-emerald-400/30 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-400/10"
          >
            Enviar otro
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => void submit(e)}
        className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-5"
      >
        <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 px-4 py-3 text-sm text-violet-100/90">
          Envío simulado: no hay transacción real en BSC. Solo afecta al saldo mostrado
          en la app y a las notificaciones internas.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-400">Wallet destino</span>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 text-white"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label || shorten(w.wallet_address)} — {shorten(w.wallet_address)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-slate-400">Token</span>
            <select
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 text-white"
            >
              {activeTokens.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.symbol} — {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-400">Cantidad</span>
            <input
              required
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 text-lg font-semibold text-white"
            />
          </label>
        </div>

        {selectedWallet && selectedToken && canSubmit && (
          <p className="text-sm text-slate-400">
            Se acreditarán{" "}
            <strong className="text-white">
              {amount} {selectedToken.symbol}
            </strong>{" "}
            a{" "}
            <code className="text-cyan-200/90">{selectedWallet.wallet_address}</code>
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || busy}
          className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-[#041018] disabled:opacity-50"
        >
          {busy ? "Acreditando…" : `Acreditar ${selectedToken?.symbol ?? "token"}`}
        </button>
      </form>
    </div>
  );
}
