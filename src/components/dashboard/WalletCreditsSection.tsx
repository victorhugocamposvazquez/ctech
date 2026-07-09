"use client";

import { useCallback, useEffect, useState } from "react";
import type { ManagedTokenRecord } from "@/lib/wallet/managed-tokens";

type RegisteredWallet = {
  id: string;
  wallet_address: string;
  label: string | null;
  created_at: string;
};

type CreditEvent = {
  id: string;
  wallet_address: string;
  token_symbol: string;
  amount: string;
  tx_hash: string;
  status: string;
  credited_by: string | null;
  note: string | null;
  created_at: string;
};

function shorten(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export default function WalletCreditsSection() {
  const [wallets, setWallets] = useState<RegisteredWallet[]>([]);
  const [tokens, setTokens] = useState<ManagedTokenRecord[]>([]);
  const [credits, setCredits] = useState<CreditEvent[]>([]);
  const [treasuryConfigured, setTreasuryConfigured] = useState(false);
  const [treasuryAddress, setTreasuryAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [walletAddress, setWalletAddress] = useState("");
  const [tokenId, setTokenId] = useState("BNB");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wRes, tRes, cRes] = await Promise.all([
        fetch("/api/backoffice/wallet-addresses"),
        fetch("/api/backoffice/wallet-tokens"),
        fetch("/api/backoffice/wallet-credits"),
      ]);
      const wJson = await wRes.json();
      const tJson = await tRes.json();
      const cJson = await cRes.json();
      if (!wRes.ok) throw new Error(wJson.error ?? "Error al cargar wallets");
      if (!tRes.ok) throw new Error(tJson.error ?? "Error al cargar tokens");
      if (!cRes.ok) throw new Error(cJson.error ?? "Error al cargar créditos");
      setWallets(wJson.wallets ?? []);
      setTokens((tJson.tokens ?? []).filter((t: ManagedTokenRecord) => t.is_active));
      setCredits(cJson.credits ?? []);
      setTreasuryConfigured(!!cJson.treasuryConfigured);
      setTreasuryAddress(cJson.treasuryAddress ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitCredit = async () => {
    setBusy(true);
    setError(null);
    try {
      const body =
        tokenId === "BNB"
          ? { wallet_address: walletAddress.trim(), symbol: "BNB", amount, note: note || undefined }
          : {
              wallet_address: walletAddress.trim(),
              token_id: tokenId,
              amount,
              note: note || undefined,
            };

      const res = await fetch("/api/backoffice/wallet-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al acreditar");

      setAmount("");
      setNote("");
      await load();
      alert(
        `Acreditación enviada on-chain.\n\nTx: ${json.tx_hash}\n\nEl saldo aparecerá en MetaMask, Trust Wallet y la PWA al refrescar.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-10 rounded-xl border border-slate-700 bg-slate-900/60 p-6">
      <h2 className="text-lg font-semibold text-white">Acreditar saldo on-chain</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-400">
        Envía tokens reales desde la treasury a una dirección. El saldo será visible en{" "}
        <strong className="text-slate-300">MetaMask, Trust Wallet, nuestra PWA</strong> y cualquier
        wallet que use la misma dirección en BNB Smart Chain.
      </p>

      {!treasuryConfigured && !loading && (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Configura <code className="text-amber-100">WALLET_TREASURY_PRIVATE_KEY</code> en Vercel.
          La treasury necesita <strong>BNB para gas</strong> y saldo de los tokens BEP-20 a enviar.
        </div>
      )}

      {treasuryAddress && (
        <p className="mt-3 font-mono text-xs text-slate-500">
          Treasury: {treasuryAddress}
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-slate-300">Dirección destino</span>
          <input
            list="wallet-addresses-list"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x…"
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-sm text-white"
          />
          <datalist id="wallet-addresses-list">
            {wallets.map((w) => (
              <option key={w.id} value={w.wallet_address}>
                {w.label ? `${w.label} — ` : ""}
                {shorten(w.wallet_address)}
              </option>
            ))}
          </datalist>
        </label>

        <label className="block text-sm">
          <span className="text-slate-300">Token</span>
          <select
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="BNB">BNB (nativo)</option>
            {tokens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.symbol} — {t.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-slate-300">Cantidad</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="text-slate-300">Nota (opcional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={busy || !treasuryConfigured || !walletAddress || !amount}
        onClick={() => void submitCredit()}
        className="mt-4 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {busy ? "Enviando on-chain…" : "Acreditar on-chain"}
      </button>

      {credits.length > 0 && (
        <div className="mt-8 overflow-x-auto">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">Últimas acreditaciones</h3>
          <table className="w-full min-w-[640px] text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-slate-700 text-xs uppercase text-slate-500">
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Wallet</th>
                <th className="py-2 pr-3">Token</th>
                <th className="py-2 pr-3">Cantidad</th>
                <th className="py-2">Tx</th>
              </tr>
            </thead>
            <tbody>
              {credits.map((c) => (
                <tr key={c.id} className="border-b border-slate-800">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {new Date(c.created_at).toLocaleString("es-ES")}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">{shorten(c.wallet_address)}</td>
                  <td className="py-2 pr-3">{c.token_symbol}</td>
                  <td className="py-2 pr-3">{c.amount}</td>
                  <td className="py-2 font-mono text-xs">
                    <a
                      href={`https://bscscan.com/tx/${c.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline"
                    >
                      {c.tx_hash.slice(0, 10)}…
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && <p className="mt-4 text-sm text-slate-500">Cargando…</p>}
    </section>
  );
}
