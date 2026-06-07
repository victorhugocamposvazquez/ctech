"use client";

import { useCallback, useEffect, useState } from "react";

type TreasuryStatus = {
  ready: boolean;
  activeSource: "env" | "panel" | "none";
  envConfigured: boolean;
  envAddress: string | null;
  activeAddress: string | null;
  priorityNote: string;
  panel: {
    address: string;
    label: string | null;
    notes: string | null;
    privateKeyHint: string;
    updatedAt: string;
  } | null;
  balances: { network: string; balance: string; symbol: string }[];
};

type Props = {
  visible: boolean;
};

export default function EvmTreasuryPanel({ visible }: Props) {
  const [status, setStatus] = useState<TreasuryStatus | null>(null);
  const [address, setAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [label, setLabel] = useState("Treasury lab");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/labs/evm/treasury");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error cargando treasury");
      setStatus(json);
      if (json.panel) {
        setAddress(json.panel.address);
        setLabel(json.panel.label ?? "Treasury lab");
        setNotes(json.panel.notes ?? "");
      } else if (json.envAddress && !json.panel) {
        setAddress(json.envAddress);
      }
      setPrivateKey("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/labs/evm/treasury", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treasuryAddress: address,
          treasuryPrivateKey: privateKey,
          label,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error guardando");
      setMessage(json.message ?? "Treasury guardada");
      setPrivateKey("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!window.confirm("¿Borrar la treasury guardada en el panel? (No afecta a Vercel env)")) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/labs/evm/treasury", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error");
      setAddress("");
      setPrivateKey("");
      setNotes("");
      setMessage("Configuración del panel eliminada");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-violet-100">Treasury — control manual</h2>
          <p className="mt-1 text-xs text-violet-200/70">
            Crea la wallet fuera (MetaMask/Trust), pega aquí dirección y private key. Solo instructores.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="text-xs rounded-lg border border-violet-400/30 px-3 py-1.5 text-violet-200 hover:bg-violet-500/10 disabled:opacity-50"
        >
          {loading ? "…" : "Actualizar"}
        </button>
      </div>

      {status && (
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs space-y-1">
          <p className="text-slate-300">
            Activa:{" "}
            <span className="text-white font-medium">
              {status.activeSource === "env"
                ? "Variable de entorno (Vercel)"
                : status.activeSource === "panel"
                  ? "Panel"
                  : "Sin configurar"}
            </span>
            {status.ready ? (
              <span className="ml-2 text-emerald-300">● Lista</span>
            ) : (
              <span className="ml-2 text-amber-300">● Pendiente</span>
            )}
          </p>
          {status.activeAddress && (
            <p className="font-mono text-slate-400 break-all">0x… {status.activeAddress.slice(2, 14)}…</p>
          )}
          {status.balances.length > 0 && (
            <p className="text-slate-400">
              Gas:{" "}
              {status.balances.map((b) => (
                <span key={b.network} className="mr-3 text-slate-200">
                  {b.network.toUpperCase()}: {Number(b.balance).toFixed(4)} {b.symbol}
                </span>
              ))}
            </p>
          )}
          <p className="text-slate-500">{status.priorityNote}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-3">
        <label className="block text-xs text-slate-400">
          Etiqueta (opcional)
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
            placeholder="Treasury lab BSC+ETH"
          />
        </label>

        <label className="block text-xs text-slate-400">
          Dirección treasury (0x…)
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value.trim())}
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-mono text-white"
            placeholder="0x..."
          />
        </label>

        <label className="block text-xs text-slate-400">
          Private key
          {status?.panel?.privateKeyHint && !privateKey && (
            <span className="ml-2 text-slate-500">guardada: {status.panel.privateKeyHint}</span>
          )}
          <input
            type="password"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value.trim())}
            required={!status?.panel}
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-mono text-white"
            placeholder={status?.panel ? "Dejar vacío para mantener la actual" : "0x... o hex sin 0x"}
          />
        </label>

        <label className="block text-xs text-slate-400">
          Notas (opcional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white resize-none"
            placeholder="Wallet creada en MetaMask el…"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving || (!privateKey && !status?.panel && !address)}
            className="rounded-lg bg-violet-500/30 border border-violet-400/40 px-4 py-2 text-sm text-violet-100 hover:bg-violet-500/40 disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Guardar treasury"}
          </button>
          {status?.panel && (
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 disabled:opacity-40"
            >
              Borrar del panel
            </button>
          )}
        </div>
      </form>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        Wallet de lab dedicada, nunca personal. La key se guarda cifrada en tránsito (HTTPS) en Supabase;
        solo el servidor la usa para firmar. Alternativa: <code>EVM_LAB_TREASURY_PRIVATE_KEY</code> en Vercel
        (tiene prioridad).
      </p>
    </div>
  );
}
