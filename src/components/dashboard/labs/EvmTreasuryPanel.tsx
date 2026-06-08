"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetch-json";

type TreasuryStatus = {
  ready: boolean;
  activeSource: "env" | "panel" | "none";
  envConfigured: boolean;
  envAddress: string | null;
  activeAddress: string | null;
  priorityNote: string;
  panelInactive?: boolean;
  panel: {
    address: string;
    label: string | null;
    notes: string | null;
    privateKeyHint: string;
    updatedAt: string;
    isActive?: boolean;
  } | null;
  balances: { network: string; balance: string; symbol: string }[];
};

type Props = {
  visible: boolean;
};

const MIN_GAS_HINT = { bsc: 0.005, ethereum: 0.002 };

function copyText(text: string) {
  void navigator.clipboard.writeText(text);
}

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
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    try {
      const { res, json } = await fetchJson<TreasuryStatus>("/api/labs/evm/treasury");
      if (!res.ok) throw new Error((json as unknown as { error?: string }).error ?? "Error cargando treasury");
      setStatus(json);
      if (json.panel?.address) {
        setAddress(json.panel.address);
        setLabel(json.panel.label ?? "Treasury lab");
        setNotes(json.panel.notes ?? "");
      } else if (json.activeAddress) {
        setAddress(json.activeAddress);
      } else if (json.envAddress) {
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

  const displayAddress = status?.activeAddress ?? address;
  const bscBalance = status?.balances.find((b) => b.network === "bsc");
  const ethBalance = status?.balances.find((b) => b.network === "ethereum");
  const needsBscGas =
    status?.ready && (!bscBalance || Number(bscBalance.balance) < MIN_GAS_HINT.bsc);
  const needsEthGas =
    status?.ready && (!ethBalance || Number(ethBalance.balance) < MIN_GAS_HINT.ethereum);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!status?.panel && !privateKey.trim()) {
      setError("La private key es obligatoria en el primer guardado.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { res, json } = await fetchJson<Record<string, unknown>>("/api/labs/evm/treasury", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treasuryAddress: address,
          treasuryPrivateKey: privateKey,
          label,
          notes,
        }),
      });
      if (!res.ok) throw new Error(String(json.error ?? "Error guardando"));
      setMessage(String(json.message ?? "Treasury guardada"));
      setPrivateKey("");
      void load();
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
      const { res, json } = await fetchJson<Record<string, unknown>>("/api/labs/evm/treasury", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(String(json.error ?? "Error"));
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

  function handleCopyAddress() {
    if (!displayAddress) return;
    copyText(displayAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-violet-100">Treasury — control manual</h2>
          <p className="mt-1 text-xs text-violet-200/70">
            Crea la wallet fuera (MetaMask/Trust), pega dirección y private key. Solo instructores.
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
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs space-y-2">
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
            ) : status.panelInactive ? (
              <span className="ml-2 text-amber-300">● Desactivada — pulsa Guardar para reactivar</span>
            ) : status.panel ? (
              <span className="ml-2 text-amber-300">● Guardada — falta key válida o SUPABASE_SERVICE_ROLE_KEY</span>
            ) : (
              <span className="ml-2 text-amber-300">● Sin configurar</span>
            )}
          </p>
          {displayAddress && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-slate-200 break-all text-[11px]">{displayAddress}</p>
              <button
                type="button"
                onClick={handleCopyAddress}
                className="shrink-0 rounded border border-violet-400/30 px-2 py-0.5 text-violet-200 hover:bg-violet-500/10"
              >
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
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
          {status.panel?.privateKeyHint && (
            <p className="text-slate-500">Key en panel: {status.panel.privateKeyHint}</p>
          )}
          <p className="text-slate-500">{status.priorityNote}</p>
        </div>
      )}

      {!loading && !status && !error && (
        <p className="text-xs text-amber-300">
          No se cargó el estado. Comprueba SUPABASE_SERVICE_ROLE_KEY en Vercel y pulsa Actualizar.
        </p>
      )}

      {status?.ready && (needsBscGas || needsEthGas) && displayAddress && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-50 space-y-2">
          <p className="font-medium text-amber-100">Envía gas nativo a la treasury</p>
          <p className="text-amber-100/90 leading-relaxed">
            Desde MetaMask, Binance u otro exchange, envía a la dirección de arriba en la red correcta:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-amber-100/80">
            {needsBscGas && (
              <li>
                <strong>BSC (BNB):</strong> mínimo ~{MIN_GAS_HINT.bsc} BNB para desplegar el contrato
                (recomendado 0.01–0.02 BNB para varias txs).
              </li>
            )}
            {needsEthGas && (
              <li>
                <strong>Ethereum (ETH):</strong> mínimo ~{MIN_GAS_HINT.ethereum} ETH si vas a desplegar
                en mainnet (gas más caro).
              </li>
            )}
          </ul>
          <p className="text-amber-200/70">
            En MetaMask: red BSC → Enviar → pega la dirección treasury. Tras confirmar, pulsa{" "}
            <strong>Actualizar</strong> para ver el saldo.
          </p>
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
            disabled={saving || !address.trim() || (!status?.panel && !privateKey.trim())}
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
        Wallet de lab dedicada, nunca personal. La key se guarda en Supabase (HTTPS); solo el servidor
        la usa para firmar. En Vercel necesitas también{" "}
        <code className="text-slate-400">SUPABASE_SERVICE_ROLE_KEY</code> para leerla. Alternativa:{" "}
        <code className="text-slate-400">EVM_LAB_TREASURY_PRIVATE_KEY</code> en env (tiene prioridad).
      </p>
    </div>
  );
}
