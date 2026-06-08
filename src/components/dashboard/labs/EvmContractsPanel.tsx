"use client";

import { useCallback, useEffect, useState } from "react";

type NetworkStatus = {
  id: string;
  label: string;
  shortLabel: string;
  nativeCurrency: string;
  treasuryReady: boolean;
  treasury: {
    address: string;
    balance: string;
    symbol: string;
    balanceUnavailable?: boolean;
  } | null;
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
  treasuryPanelConfigured?: boolean;
  networks: NetworkStatus[];
};

type Props = {
  visible: boolean;
};

async function pollDeployConfirm(
  networkId: string,
  txHash: string,
  force: boolean,
  onTick?: (attempt: number) => void
): Promise<{ contractAddress?: string; explorerUrl?: string }> {
  for (let attempt = 1; attempt <= 30; attempt++) {
    onTick?.(attempt);
    const res = await fetch("/api/labs/evm/contracts/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network: networkId, txHash, force }),
    });
    const json = await res.json();
    if (res.status === 202) {
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    if (!res.ok) throw new Error(json.error ?? "Error confirmando deploy");
    return { contractAddress: json.contractAddress, explorerUrl: json.explorerUrl };
  }
  throw new Error("Timeout esperando confirmación on-chain. Registra el contrato manualmente.");
}

export default function EvmContractsPanel({ visible }: Props) {
  const [data, setData] = useState<InfraResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyNetwork, setBusyNetwork] = useState<string | null>(null);
  const [confirmAttempt, setConfirmAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [registerNetwork, setRegisterNetwork] = useState("bsc");
  const [registerAddress, setRegisterAddress] = useState("");
  const [registerTx, setRegisterTx] = useState("");
  const [showRegister, setShowRegister] = useState(false);

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
    setConfirmAttempt(0);
    try {
      const res = await fetch("/api/labs/evm/contracts/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network: networkId, force }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409 && !force) {
          const ok = window.confirm(`${json.error}\n\n¿Redeploy de todos modos?`);
          if (ok) return handleDeploy(networkId, true);
        }
        throw new Error(json.error ?? "Deploy fallido");
      }

      setMessage(
        `Tx enviada (${networkId}). Confirmando en BSC/Eth… ${json.txExplorerUrl ? "Abre el explorer si tarda." : ""}`
      );

      const confirmed = await pollDeployConfirm(networkId, json.txHash, force, setConfirmAttempt);
      setMessage(
        `Contrato listo en ${networkId}: ${confirmed.contractAddress?.slice(0, 12)}…`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyNetwork(null);
      setConfirmAttempt(0);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusyNetwork("register");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/labs/evm/contracts/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network: registerNetwork,
          contractAddress: registerAddress.trim(),
          deployTxHash: registerTx.trim() || undefined,
          force: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error registrando");
      setMessage(`Contrato registrado en ${registerNetwork}: ${json.contractAddress?.slice(0, 12)}…`);
      setRegisterAddress("");
      setRegisterTx("");
      setShowRegister(false);
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

  const displayNetworks = (data?.networks ?? []).filter(
    (n) => n.id === "bsc" || n.id === "ethereum"
  );

  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-emerald-100">Infra EVM — contratos</h2>
          <p className="mt-1 text-xs text-emerald-200/70">
            Paso 2 del lab: despliega FlashUSDTLab. Si el deploy se cortó, regístralo manualmente.
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

      {loading && !data && (
        <p className="text-xs text-slate-400 animate-pulse">Cargando estado de contratos…</p>
      )}

      {!loading && !data && !error && (
        <p className="text-xs text-amber-300">No se pudo cargar infra EVM. Pulsa Actualizar.</p>
      )}

      {!data?.treasuryEnvConfigured && !data?.treasuryPanelConfigured && data && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          Configura la treasury en el panel superior primero.
        </div>
      )}

      {!data?.explorerApiConfigured && data && (
        <div className="rounded-lg border border-slate-400/20 bg-white/5 px-3 py-2 text-xs text-slate-300">
          Verificación opcional: <code className="text-slate-100">EVM_EXPLORER_API_KEY</code>
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
          {confirmAttempt > 0 && (
            <span className="block mt-1 text-emerald-200/70">
              Esperando confirmación… intento {confirmAttempt}/30
            </span>
          )}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {displayNetworks.map((net) => (
          <div
            key={net.id}
            className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">{net.label}</h3>
              <StatusBadge ok={net.contract.operational} label={net.contract.operational ? "Listo" : "Pendiente"} />
            </div>

            {net.treasuryReady && net.treasury ? (
              <div className="text-xs space-y-1">
                <p className="text-slate-400 font-mono break-all">
                  Treasury: {net.treasury.address.slice(0, 10)}… ·{" "}
                  <span
                    className={
                      Number(net.treasury.balance) < 0.001 ? "text-amber-300" : "text-slate-200"
                    }
                  >
                    {Number(net.treasury.balance).toFixed(4)} {net.treasury.symbol}
                  </span>
                </p>
                {Number(net.treasury.balance) < 0.005 && (
                  <p className="text-amber-300/90">Saldo bajo — envía {net.treasury.symbol} a treasury.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-amber-300">Treasury no configurada.</p>
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
              <p className="text-xs text-slate-500">Sin contrato en BD</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!net.treasuryReady || busyNetwork !== null}
                onClick={() => handleDeploy(net.id)}
                className="rounded-lg bg-emerald-500/30 border border-emerald-400/40 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-500/40 disabled:opacity-40"
              >
                {busyNetwork === net.id
                  ? confirmAttempt > 0
                    ? `Confirmando ${confirmAttempt}/30…`
                    : "Enviando tx…"
                  : net.contract.address
                    ? "Redeploy"
                    : "Desplegar"}
              </button>
              {net.contract.address && net.verification.available && (
                <>
                  <button
                    type="button"
                    disabled={busyNetwork !== null}
                    onClick={() => handleVerify(net.id, "submit")}
                    className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-40"
                  >
                    Verificar
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
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
        <button
          type="button"
          onClick={() => setShowRegister((v) => !v)}
          className="text-xs text-cyan-300 hover:underline"
        >
          {showRegister ? "Ocultar" : "¿Deploy cortado? Registrar contrato manualmente"}
        </button>
        {showRegister && (
          <form onSubmit={handleRegister} className="space-y-2 text-xs">
            <p className="text-slate-400">
              Pega la dirección del contrato desde BscScan/Etherscan (pestaña Contract creation).
            </p>
            <select
              value={registerNetwork}
              onChange={(e) => setRegisterNetwork(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            >
              <option value="bsc">BSC</option>
              <option value="ethereum">Ethereum</option>
            </select>
            <input
              value={registerAddress}
              onChange={(e) => setRegisterAddress(e.target.value.trim())}
              placeholder="0x… dirección del contrato"
              required
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-white"
            />
            <input
              value={registerTx}
              onChange={(e) => setRegisterTx(e.target.value.trim())}
              placeholder="0x… tx hash (opcional)"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-white"
            />
            <button
              type="submit"
              disabled={busyNetwork === "register"}
              className="rounded-lg bg-cyan-500/20 border border-cyan-400/40 px-3 py-2 text-cyan-100 disabled:opacity-40"
            >
              {busyNetwork === "register" ? "Registrando…" : "Registrar contrato"}
            </button>
          </form>
        )}
      </div>

      {data?.artifact && (
        <p className="text-[10px] text-slate-500">
          Artifact: {data.artifact.contractName} · {data.artifact.compilerVersion}
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
