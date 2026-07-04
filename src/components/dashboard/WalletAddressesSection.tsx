"use client";

import { useCallback, useEffect, useState } from "react";
import { isAddress } from "viem";

export interface RegisteredWalletRow {
  id: string;
  wallet_address: string;
  label: string | null;
  last_scanned_block: number;
  created_at: string;
  updated_at: string;
}

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletAddressesSection() {
  const [wallets, setWallets] = useState<RegisteredWalletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backoffice/wallet-addresses");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al cargar wallets");
      setWallets(json.wallets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddress(address.trim())) {
      setError("Dirección BSC inválida (debe empezar por 0x…)");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/backoffice/wallet-addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address.trim(),
          label: label.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");

      setWallets((prev) => {
        const exists = prev.find((w) => w.id === json.wallet.id);
        if (exists) {
          return prev.map((w) => (w.id === json.wallet.id ? json.wallet : w));
        }
        return [json.wallet, ...prev];
      });
      setAddress("");
      setLabel("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta wallet del listado? No borra fondos on-chain.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/backoffice/wallet-addresses/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al eliminar");
      setWallets((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (id: string, addr: string) => {
    await navigator.clipboard.writeText(addr);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Wallets destino</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Registra las direcciones BSC de tus usuarios. Envía tokens BEP-20 (USDT, USDC…)
            desde MetaMask u otra wallet externa a estas direcciones; la app detectará la
            transferencia y mostrará la notificación.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2 text-sm font-medium text-white"
        >
          {showForm ? "Cancelar" : "Añadir wallet"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => void submit(e)}
          className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4"
        >
          <label className="block text-sm">
            <span className="text-slate-400">Dirección BSC (0x…)</span>
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 font-mono text-sm text-white"
              placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
              spellCheck={false}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Etiqueta (opcional)</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 text-white"
              placeholder="Usuario demo, iPhone Hugo…"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-[#041018] disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Registrar wallet"}
          </button>
        </form>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#0b1230]/80 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Cargando wallets…</div>
        ) : wallets.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm text-slate-400">No hay wallets registradas.</p>
            <p className="text-xs text-slate-500">
              Añade la dirección que ves en Recibir dentro de la app, o espera a que el
              usuario abra la wallet (se registra sola).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Wallet</th>
                  <th className="px-5 py-3">Dirección</th>
                  <th className="px-5 py-3">Registrada</th>
                  <th className="px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((w) => (
                  <tr key={w.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">
                        {w.label || "Sin etiqueta"}
                      </div>
                      <div className="text-xs text-slate-500">{shorten(w.wallet_address)}</div>
                    </td>
                    <td className="px-5 py-4">
                      <code className="text-xs text-cyan-200/90 break-all">
                        {w.wallet_address}
                      </code>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {new Date(w.created_at).toLocaleString("es-ES")}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void copy(w.id, w.wallet_address)}
                          className="rounded-lg border border-cyan-400/30 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-400/10"
                        >
                          {copiedId === w.id ? "Copiado" : "Copiar"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void remove(w.id)}
                          className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs text-red-200 hover:bg-red-400/10 disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100/90">
        <strong className="font-semibold">Cómo enviar tokens:</strong> copia la dirección,
        abre MetaMask en BSC y envía el token BEP-20 (usa la dirección de contrato de la
        tabla de arriba). El saldo aparecerá on-chain en la app y llegará la notificación
        cuando el usuario tenga la wallet abierta.
      </div>
    </div>
  );
}
