"use client";

import { useCallback, useEffect, useState } from "react";
import type { ManagedTokenRecord } from "@/lib/wallet/managed-tokens";

type TokenForm = {
  symbol: string;
  name: string;
  contract_address: string;
  decimals: string;
  logo_url: string;
  sort_order: string;
};

const emptyForm: TokenForm = {
  symbol: "",
  name: "",
  contract_address: "",
  decimals: "18",
  logo_url: "",
  sort_order: "0",
};

export default function WalletTokensConsole() {
  const [tokens, setTokens] = useState<ManagedTokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TokenForm>(emptyForm);
  const [formBusy, setFormBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backoffice/wallet-tokens");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al cargar tokens");
      setTokens(json.tokens ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (token: ManagedTokenRecord) => {
    setSavingId(token.id);
    setError(null);
    try {
      const res = await fetch(`/api/backoffice/wallet-tokens/${token.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !token.is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al actualizar");
      setTokens((prev) =>
        prev.map((t) => (t.id === token.id ? json.token : t))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingId(null);
    }
  };

  const seedDefaults = async () => {
    setFormBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/backoffice/wallet-tokens", { method: "PUT" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al restaurar");
      setTokens(json.tokens ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFormBusy(false);
    }
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/backoffice/wallet-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: form.symbol,
          name: form.name,
          contract_address: form.contract_address,
          decimals: Number(form.decimals),
          logo_url: form.logo_url || null,
          sort_order: Number(form.sort_order),
          is_active: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al crear");
      setTokens((prev) => [...prev, json.token]);
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFormBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Wallets</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Tokens simulados con símbolos y direcciones reales en BSC (USDT, USDC, BTC, ETH).
            Actívalos o desactívalos para controlar qué aparece en la wallet y qué transferencias
            generan notificaciones in-app.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
          >
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => void seedDefaults()}
            disabled={formBusy}
            className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-50"
          >
            Restaurar defaults
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2 text-sm font-medium text-white"
          >
            {showForm ? "Cancelar" : "Nuevo token"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(e) => void submitForm(e)}
          className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Añadir token
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-400">Símbolo</span>
              <input
                required
                value={form.symbol}
                onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 text-white"
                placeholder="USDT"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Nombre</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 text-white"
                placeholder="Tether USD"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-400">Dirección del contrato (BSC)</span>
              <input
                required
                value={form.contract_address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contract_address: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 font-mono text-sm text-white"
                placeholder="0x..."
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Decimales</span>
              <input
                type="number"
                value={form.decimals}
                onChange={(e) => setForm((f) => ({ ...f, decimals: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Orden</span>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 text-white"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={formBusy}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-[#041018] disabled:opacity-50"
          >
            {formBusy ? "Guardando…" : "Crear token"}
          </button>
        </form>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#0b1230]/80 overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-200">Tokens configurados</h2>
          <p className="text-xs text-slate-500 mt-1">
            Las direcciones son las oficiales en BNB Smart Chain para recibir transferencias reales.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Cargando…</div>
        ) : tokens.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-slate-400">No hay tokens configurados.</p>
            <button
              type="button"
              onClick={() => void seedDefaults()}
              className="rounded-xl border border-cyan-400/30 px-4 py-2 text-sm text-cyan-200"
            >
              Cargar USDT, USDC, BTC y ETH
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Token</th>
                  <th className="px-5 py-3">Contrato BSC</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{token.symbol}</div>
                      <div className="text-xs text-slate-400">{token.name}</div>
                    </td>
                    <td className="px-5 py-4">
                      <code className="text-xs text-cyan-200/90 break-all">
                        {token.contract_address}
                      </code>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          token.is_active
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
                            : "bg-slate-500/15 text-slate-400 border border-slate-500/30"
                        }`}
                      >
                        {token.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        disabled={savingId === token.id}
                        onClick={() => void toggleActive(token)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                          token.is_active
                            ? "border border-amber-400/30 text-amber-200 hover:bg-amber-400/10"
                            : "border border-emerald-400/30 text-emerald-200 hover:bg-emerald-400/10"
                        }`}
                      >
                        {savingId === token.id
                          ? "…"
                          : token.is_active
                            ? "Desactivar"
                            : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-semibold text-slate-200">Notificaciones in-app</h3>
        <p className="mt-2 text-sm text-slate-400">
          El cron <code className="text-cyan-200">/api/cron/wallet-watch</code> escanea
          transferencias entrantes a wallets registradas. Cuando llega un token activo, la wallet
          recibe una notificación dentro de la app.
        </p>
      </div>
    </div>
  );
}
