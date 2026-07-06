"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import type { ManagedTokenRecord } from "@/lib/wallet/managed-tokens";
import type { RegisteredWalletRow } from "./WalletAddressesSection";

type SendMode = "credit" | "transfer";

type SimulatedOperation = {
  id: string;
  txHash: string;
  kind: "credit" | "transfer";
  symbol: string;
  decimals: number;
  amount: number;
  fromAddress: string;
  toAddress: string;
  walletAddress: string;
  detectedAt: string;
  reversedAt: string | null;
};

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function walletLabel(
  address: string,
  wallets: RegisteredWalletRow[]
): string {
  const match = wallets.find(
    (w) => w.wallet_address.toLowerCase() === address.toLowerCase()
  );
  if (match?.label) return `${match.label} (${shorten(address)})`;
  return shorten(address);
}

export function WalletSendSection() {
  const [wallets, setWallets] = useState<RegisteredWalletRow[]>([]);
  const [tokens, setTokens] = useState<ManagedTokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<SendMode>("transfer");
  const [fromWalletId, setFromWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [amount, setAmount] = useState("");
  const [fromBalances, setFromBalances] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    mode: SendMode;
    symbol: string;
    amount: string;
    from?: string;
    to: string;
  } | null>(null);
  const [operations, setOperations] = useState<SimulatedOperation[]>([]);
  const [opsLoading, setOpsLoading] = useState(true);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const activeTokens = useMemo(
    () => tokens.filter((t) => t.is_active),
    [tokens]
  );
  const fromWallet = wallets.find((w) => w.id === fromWalletId);
  const toWallet = wallets.find((w) => w.id === toWalletId);
  const selectedToken = activeTokens.find((t) => t.id === tokenId);
  const fromSimulatedRaw = selectedToken
    ? BigInt(fromBalances[selectedToken.id] ?? "0")
    : 0n;

  const canSubmit =
    toWallet &&
    selectedToken &&
    amount.trim() &&
    !Number.isNaN(Number(amount)) &&
    Number(amount) > 0 &&
    (mode === "credit" || (fromWallet && fromWallet.id !== toWallet.id));

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

  const loadOperations = useCallback(async () => {
    setOpsLoading(true);
    try {
      const res = await fetch("/api/backoffice/wallet-simulated-events?limit=30");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al cargar historial");
      setOperations(json.operations ?? []);
    } catch {
      setOperations([]);
    } finally {
      setOpsLoading(false);
    }
  }, []);

  const revertOperation = async (op: SimulatedOperation) => {
    const amountLabel = op.amount.toLocaleString("es-ES", {
      maximumFractionDigits: 6,
    });
    const fromLabel = walletLabel(op.fromAddress, wallets);
    const toLabel = walletLabel(op.toAddress, wallets);

    const message =
      op.kind === "credit"
        ? `¿Revertir acreditación de ${amountLabel} ${op.symbol} a ${toLabel}?\n\nSe restará todo el saldo acreditado en esa wallet.`
        : `¿Revertir transferencia wallet → wallet de ${amountLabel} ${op.symbol}?\n\n• ${toLabel} perderá el saldo recibido\n• ${fromLabel} recuperará el importe\n\nAmbas wallets recibirán una notificación.`;

    if (!window.confirm(message)) return;

    setRevertingId(op.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/backoffice/wallet-simulated-events/${op.id}/revert`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al revertir");

      await loadOperations();
      if (mode === "transfer" && fromWallet) {
        const balRes = await fetch(
          `/api/wallet/credits?address=${encodeURIComponent(fromWallet.wallet_address)}`
        );
        const balJson = await balRes.json();
        if (balRes.ok) setFromBalances(balJson.balances ?? {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevertingId(null);
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadOperations();
  }, [loadOperations]);

  useEffect(() => {
    if (!fromWalletId && wallets[0]) setFromWalletId(wallets[0].id);
    if (!toWalletId && wallets[1]) setToWalletId(wallets[1].id);
    else if (!toWalletId && wallets[0]) setToWalletId(wallets[0].id);
  }, [wallets, fromWalletId, toWalletId]);

  useEffect(() => {
    const firstActive = activeTokens[0];
    if (!tokenId && firstActive) setTokenId(firstActive.id);
  }, [activeTokens, tokenId]);

  useEffect(() => {
    if (mode !== "transfer" || !fromWallet) {
      setFromBalances({});
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/wallet/credits?address=${encodeURIComponent(fromWallet.wallet_address)}`
        );
        const json = await res.json();
        if (!cancelled && res.ok) {
          setFromBalances(json.balances ?? {});
        }
      } catch {
        if (!cancelled) setFromBalances({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, fromWallet?.wallet_address, fromWallet]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toWallet || !selectedToken || !canSubmit) return;
    if (mode === "transfer" && !fromWallet) return;

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "credit") {
        const res = await fetch("/api/backoffice/wallet-credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet_address: toWallet.wallet_address,
            token_id: selectedToken.id,
            amount: amount.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Error al acreditar");

        setSuccess({
          mode: "credit",
          symbol: selectedToken.symbol,
          amount: amount.trim(),
          to: toWallet.label || shorten(toWallet.wallet_address),
        });
      } else {
        const res = await fetch("/api/backoffice/wallet-transfers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_wallet_address: fromWallet!.wallet_address,
            to_wallet_address: toWallet.wallet_address,
            token_id: selectedToken.id,
            amount: amount.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Error al transferir");

        setSuccess({
          mode: "transfer",
          symbol: selectedToken.symbol,
          amount: amount.trim(),
          from: fromWallet!.label || shorten(fromWallet!.wallet_address),
          to: toWallet.label || shorten(toWallet.wallet_address),
        });
      }

      setAmount("");
      if (mode === "transfer" && fromWallet) {
        const res = await fetch(
          `/api/wallet/credits?address=${encodeURIComponent(fromWallet.wallet_address)}`
        );
        const json = await res.json();
        if (res.ok) setFromBalances(json.balances ?? {});
      }
      void loadOperations();
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
          Registra al menos una wallet arriba para acreditar o transferir tokens.
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

  const needsSecondWallet = mode === "transfer" && wallets.length < 2;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Enviar tokens (simulado)</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Acredita tokens desde el sistema o transfiere saldo simulado entre wallets
          registradas. Los saldos y notificaciones se actualizan al instante en la app.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("transfer")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            mode === "transfer"
              ? "bg-cyan-500 text-[#041018]"
              : "border border-white/10 text-slate-300 hover:bg-white/5"
          }`}
        >
          Wallet → wallet
        </button>
        <button
          type="button"
          onClick={() => setMode("credit")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            mode === "credit"
              ? "bg-cyan-500 text-[#041018]"
              : "border border-white/10 text-slate-300 hover:bg-white/5"
          }`}
        >
          Acreditar (mint)
        </button>
      </div>

      {needsSecondWallet && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Para transferir entre wallets necesitas registrar al menos dos direcciones.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100 space-y-1">
          {success.mode === "credit" ? (
            <p className="font-medium">
              +{success.amount} {success.symbol} acreditados en {success.to}
            </p>
          ) : (
            <p className="font-medium">
              {success.amount} {success.symbol} enviados de {success.from} a {success.to}
            </p>
          )}
          <p className="text-xs text-emerald-200/80">
            Ambas wallets verán el saldo actualizado y la notificación en la app.
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
          {mode === "transfer"
            ? "Transferencia simulada: se debita la wallet origen y se acredita la destino. No hay transacción real en BSC."
            : "Acreditación simulada: crea saldo nuevo en la wallet destino sin debitar otra wallet."}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {mode === "transfer" && (
            <label className="block text-sm">
              <span className="text-slate-400">Wallet origen</span>
              <select
                value={fromWalletId}
                onChange={(e) => setFromWalletId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 text-white"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id} disabled={w.id === toWalletId}>
                    {w.label || shorten(w.wallet_address)} — {shorten(w.wallet_address)}
                  </option>
                ))}
              </select>
              {selectedToken && fromWallet && (
                <span className="mt-1 block text-xs text-slate-500">
                  Saldo simulado:{" "}
                  {formatUnits(fromSimulatedRaw, selectedToken.decimals)}{" "}
                  {selectedToken.symbol}
                </span>
              )}
            </label>
          )}

          <label className="block text-sm">
            <span className="text-slate-400">
              {mode === "transfer" ? "Wallet destino" : "Wallet destino (acreditación)"}
            </span>
            <select
              value={toWalletId}
              onChange={(e) => setToWalletId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 text-white"
            >
              {wallets.map((w) => (
                <option
                  key={w.id}
                  value={w.id}
                  disabled={mode === "transfer" && w.id === fromWalletId}
                >
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

        {toWallet && selectedToken && canSubmit && (
          <p className="text-sm text-slate-400">
            {mode === "credit" ? (
              <>
                Se acreditarán{" "}
                <strong className="text-white">
                  {amount} {selectedToken.symbol}
                </strong>{" "}
                a{" "}
                <code className="text-cyan-200/90">{toWallet.wallet_address}</code>
              </>
            ) : (
              <>
                Se transferirán{" "}
                <strong className="text-white">
                  {amount} {selectedToken.symbol}
                </strong>{" "}
                de{" "}
                <code className="text-cyan-200/90">{fromWallet?.wallet_address}</code> a{" "}
                <code className="text-cyan-200/90">{toWallet.wallet_address}</code>
              </>
            )}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || busy || needsSecondWallet}
          className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-[#041018] disabled:opacity-50"
        >
          {busy
            ? mode === "credit"
              ? "Acreditando…"
              : "Transfiriendo…"
            : mode === "credit"
              ? `Acreditar ${selectedToken?.symbol ?? "token"}`
              : `Transferir ${selectedToken?.symbol ?? "token"}`}
        </button>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="font-semibold text-white">Historial simulado</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Acreditaciones y transferencias wallet → wallet. Revertir deshace la operación
              completa (resta en destino y devuelve en origen cuando aplica).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadOperations()}
            disabled={opsLoading}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            {opsLoading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        {opsLoading && operations.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Cargando historial…</div>
        ) : operations.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No hay operaciones simuladas todavía.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Detalle</th>
                  <th className="px-5 py-3 font-medium">Cantidad</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => {
                  const when = new Date(op.detectedAt).toLocaleString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const amountLabel = op.amount.toLocaleString("es-ES", {
                    maximumFractionDigits: 6,
                  });
                  const reverted = !!op.reversedAt;
                  const fromLabel = walletLabel(op.fromAddress, wallets);
                  const toLabel = walletLabel(op.toAddress, wallets);

                  return (
                    <tr key={op.id} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3 text-slate-300 whitespace-nowrap">{when}</td>
                      <td className="px-5 py-3 text-slate-300">
                        {op.kind === "credit" ? (
                          <span>Mint</span>
                        ) : (
                          <span title="Wallet → wallet">W → W</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">
                        {op.kind === "credit" ? (
                          <>→ {toLabel}</>
                        ) : (
                          <>
                            {fromLabel} → {toLabel}
                          </>
                        )}
                      </td>
                      <td className="px-5 py-3 font-medium text-white whitespace-nowrap">
                        {amountLabel} {op.symbol}
                      </td>
                      <td className="px-5 py-3">
                        {reverted ? (
                          <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs text-slate-400">
                            Revertida
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                            Activa
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {!reverted && (
                          <button
                            type="button"
                            disabled={revertingId === op.id}
                            onClick={() => void revertOperation(op)}
                            className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            {revertingId === op.id ? "Revirtiendo…" : "Revertir"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
