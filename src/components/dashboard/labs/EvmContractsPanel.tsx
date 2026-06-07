"use client";

import { useCallback, useEffect, useState } from "react";

type NetworkStatus = {
  id: string;
  label: string;
  shortLabel: string;
  nativeCurrency: string;
  treasuryReady: boolean;
  treasury: { address: string; balance: string; symbol: string } | null;
  contract: {
    address: string | null;
    source: string | null;
    explorerUrl: string | null;
    operational: boolean;
    onChain: { name: string; symbol: string; decimals: number; owner: string } | null;
  };
  verification: {
    available: boolean;
    status: string | null;
    guid: string | null;
    verifiedAt: string | null;
    error: string | null;
  };
};

type InfraResponse = {
  artifact: { contractName: string; compilerVersion: string; optimizationRuns: number };
  explorerApiConfigured: boolean;
  treasuryEnvConfigured: boolean;
  networks: NetworkStatus[];
};

type Props = {
  visible: boolean;
};

export default function EvmContractsPanel({ visible }: Props) {
  const [data, setData] = useState<InfraResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyNetwork, setBusyNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/labs/evm/contracts");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error cargando infra EVM");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDeploy(networkId: string, force = false) {
    setBusyNetwork(networkId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/labs/evm/contracts/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network: networkId, force }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409 && !force) {
          const ok = window.confirm(
            `${json.error}\n\n¿Redeploy de todos modos?`
          );
          if (ok) return handleDeploy(networkId, true);
        }
        throw new Error(json.error ?? "Deploy fallido");
      }
      setMessage(
        `Contrato desplegado en ${networkId}: ${json.contractAddress?.slice(0, 10)}…`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyNetwork(null);
    }
  }

  async function handleVerify(networkId: string, action: "submit" | "check" = "submit") {
    setBusyNetwork(`${networkId}-${action}`);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/labs/evm/contracts/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network: networkId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Verificación fallida");
      if (action === "submit") {
        setMessage(`Verificación enviada (${networkId}). GUID: ${json.guid?.slice(0, 12)}…`);
      } else {
        setMessage(`Estado verificación ${networkId}: ${json.status}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyNetwork(null);
    }
  }

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-emerald-100">Infra EVM — contratos</h2>
          <p className="mt-1 text-xs text-emerald-200/70">
            Despliega y verifica FlashUSDTLab sin Remix. Requiere treasury en server + gas en cada red.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="text-xs rounded-lg border border-emerald-400/30 px-3 py-1.5 text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
        >
          {loading ? "…" : "Actualizar"}
        </button>
      </div>

      {!data?.treasuryEnvConfigured && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          Falta <code className="text-amber-50">EVM_LAB_TREASURY_PRIVATE_KEY</code> en el servidor.
        </div>
      )}

      {!data?.explorerApiConfigured && (
        <div className="rounded-lg border border-slate-400/20 bg-white/5 px-3 py-2 text-xs text-slate-300">
          Verificación en explorer: añade{" "}
          <code className="text-slate-100">EVM_EXPLORER_API_KEY</code> (Etherscan API v2).
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

      <div className="grid gap-3 md:grid-cols-2">
        {(data?.networks ?? []).filter((n) => n.id === "bsc" || n.id === "ethereum").map((net) => (
          <div
            key={net.id}
            className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">{net.label}</h3>
              <StatusBadge ok={net.contract.operational} label={net.contract.operational ? "Listo" : "Pendiente"} />
            </div>

            {net.treasury ? (
              <p className="text-xs text-slate-400 font-mono break-all">
                Treasury: {net.treasury.address.slice(0, 10)}… ·{" "}
                <span className="text-slate-200">
                  {Number(net.treasury.balance).toFixed(4)} {net.treasury.symbol}
                </span>
              </p>
            ) : (
              <p className="text-xs text-amber-300">Treasury no configurada o sin RPC</p>
            )}

            {net.contract.address ? (
              <div className="text-xs space-y-1">
                <p className="text-slate-400">
                  Contrato ({net.contract.source ?? "?"}){" "}
                  {net.contract.explorerUrl && (
                    <a
                      href={net.contract.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 hover:underline ml-1"
                    >
                      explorer ↗
                    </a>
                  )}
                </p>
                <p className="font-mono text-slate-200 break-all">{net.contract.address}</p>
                {net.contract.onChain && (
                  <p className="text-slate-500">
                    On-chain: {net.contract.onChain.symbol} · {net.contract.onChain.decimals} dec
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Sin contrato desplegado</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!net.treasuryReady || busyNetwork !== null}
                onClick={() => handleDeploy(net.id)}
                className="rounded-lg bg-emerald-500/30 border border-emerald-400/40 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-500/40 disabled:opacity-40"
              >
                {busyNetwork === net.id ? "Desplegando…" : net.contract.address ? "Redeploy" : "Desplegar"}
              </button>
              {net.contract.address && net.verification.available && (
                <>
                  <button
                    type="button"
                    disabled={busyNetwork !== null}
                    onClick={() => handleVerify(net.id, "submit")}
                    className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-40"
                  >
                    {busyNetwork === `${net.id}-submit` ? "…" : "Verificar"}
                  </button>
                  {net.verification.guid && (
                    <button
                      type="button"
                      disabled={busyNetwork !== null}
                      onClick={() => handleVerify(net.id, "check")}
                      className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-40"
                    >
                      Comprobar
                    </button>
                  )}
                </>
              )}
            </div>

            {net.verification.status && net.verification.status !== "unverified" && (
              <p className="text-xs text-slate-400">
                Verificación:{" "}
                <span
                  className={
                    net.verification.status === "verified"
                      ? "text-emerald-300"
                      : net.verification.status === "failed"
                        ? "text-red-300"
                        : "text-amber-300"
                  }
                >
                  {net.verification.status}
                </span>
                {net.verification.error ? ` — ${net.verification.error}` : ""}
              </p>
            )}
          </div>
        ))}
      </div>

      {data?.artifact && (
        <p className="text-[10px] text-slate-500">
          Artifact: {data.artifact.contractName} · {data.artifact.compilerVersion} · optimizer{" "}
          {data.artifact.optimizationRuns} runs
        </p>
      )}
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${
        ok
          ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10"
          : "border-slate-500/40 text-slate-400 bg-white/5"
      }`}
    >
      {label}
    </span>
  );
}
