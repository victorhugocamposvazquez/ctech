"use client";

import { useEffect, useMemo, useState } from "react";

type PerformanceBlock = {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  totalFees: number;
  netPnl: number;
  avgPnlPct: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
};

type RiskState = {
  capital: number;
  pnlToday: number;
  pnlThisWeek: number;
  tradesTodayCore: number;
  tradesTodaySatellite: number;
  isPaused: boolean;
  pauseReason: string | null;
} | null;

type PerformanceResponse = {
  global: PerformanceBlock;
  core: PerformanceBlock;
  satellite: PerformanceBlock;
  openPositions: number;
  riskState: RiskState;
};

type PositionRow = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  layer: "core" | "satellite";
  status: "open" | "closed" | "cancelled" | "failed";
  entry_price: number;
  exit_price: number | null;
  pnl_abs: number | null;
  pnl_pct: number | null;
  opened_at: string;
  closed_at: string | null;
};

type PositionsResponse = {
  count: number;
  positions: PositionRow[];
};

type CycleSummary = {
  timestamp?: string;
  regime?: string;
  poolsScanned?: number;
  tokensScanned?: number;
  earlyPoolsScanned?: number;
  earlyCandidates?: number;
  signalsGenerated?: number;
  tradesOpened?: number;
  tradesClosed?: number;
  errors?: string[];
};

type SystemStatus = {
  ready: boolean;
  envs: Record<string, boolean>;
  dbConnected: boolean;
  tablesReady: boolean;
  userAuthenticated: boolean;
  riskStateExists: boolean;
  nextSteps: string[];
};

export default function SimulationConsole() {
  const [capital, setCapital] = useState("10000");
  const [resetState, setResetState] = useState(true);
  const [runFirstCycle, setRunFirstCycle] = useState(true);
  const [walletLines, setWalletLines] = useState("");

  const [positionsStatus, setPositionsStatus] = useState<"open" | "closed" | "all">(
    "all"
  );
  const [positionsLimit, setPositionsLimit] = useState("50");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [loadingBootstrap, setLoadingBootstrap] = useState(false);
  const [loadingCycle, setLoadingCycle] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const [performance, setPerformance] = useState<PerformanceResponse | null>(null);
  const [positions, setPositions] = useState<PositionsResponse | null>(null);
  const [lastCycle, setLastCycle] = useState<CycleSummary | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    void checkStatus();
    void refreshAll();
  }, []);

  async function checkStatus() {
    try {
      const res = await fetch("/api/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      // silencioso
    }
  }

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      void refreshAll();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [autoRefresh, positionsStatus, positionsLimit]);

  async function refreshAll() {
    setLoadingData(true);
    setLastError(null);
    try {
      const [perfRes, posRes] = await Promise.all([
        fetch("/api/performance", { method: "GET" }),
        fetch(
          `/api/positions?status=${positionsStatus}&limit=${encodeURIComponent(
            positionsLimit
          )}`,
          { method: "GET" }
        ),
      ]);

      if (!perfRes.ok) {
        throw new Error(`Performance HTTP ${perfRes.status}`);
      }
      if (!posRes.ok) {
        throw new Error(`Positions HTTP ${posRes.status}`);
      }

      const perfData = (await perfRes.json()) as PerformanceResponse;
      const posData = (await posRes.json()) as PositionsResponse;

      setPerformance(perfData);
      setPositions(posData);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingData(false);
    }
  }

  async function runCycle() {
    setLoadingCycle(true);
    setLastError(null);
    setLastAction(null);
    try {
      const res = await fetch("/api/cycle", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? `Cycle HTTP ${res.status}`);
      }

      setLastCycle({
        timestamp: data.timestamp,
        regime: data.regime,
        poolsScanned: data.poolsScanned,
        tokensScanned: data.tokensScanned,
        earlyPoolsScanned: data.earlyPoolsScanned,
        earlyCandidates: data.earlyCandidates,
        signalsGenerated: data.signalsGenerated,
        tradesOpened: data.tradesOpened,
        tradesClosed: data.tradesClosed,
        errors: data.errors,
      });
      setLastAction("Ciclo ejecutado correctamente.");
      await refreshAll();
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingCycle(false);
    }
  }

  async function bootstrapSimulation() {
    setLoadingBootstrap(true);
    setLastError(null);
    setLastAction(null);

    try {
      const numericCapital = Number(capital);
      if (!Number.isFinite(numericCapital) || numericCapital <= 0) {
        throw new Error("El capital inicial debe ser un número mayor que 0.");
      }

      const trackedWallets = parseWalletLines(walletLines);
      const payload = {
        initialCapital: numericCapital,
        resetState,
        runFirstCycle,
        trackedWallets,
      };

      const res = await fetch("/api/simulation/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? `Bootstrap HTTP ${res.status}`);
      }

      setLastCycle(
        data.firstCycle
          ? {
              timestamp: data.firstCycle.timestamp,
              regime: data.firstCycle.regime,
              poolsScanned: data.firstCycle.poolsScanned,
              tokensScanned: data.firstCycle.tokensScanned,
              earlyPoolsScanned: data.firstCycle.earlyPoolsScanned,
              earlyCandidates: data.firstCycle.earlyCandidates,
              signalsGenerated: data.firstCycle.signalsGenerated,
              tradesOpened: data.firstCycle.tradesOpened,
              tradesClosed: data.firstCycle.tradesClosed,
              errors: data.firstCycle.errors,
            }
          : null
      );
      setLastAction(
        `Simulación inicializada. Wallets cargadas: ${data.walletsUpserted ?? 0}.`
      );
      await refreshAll();
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingBootstrap(false);
    }
  }

  const kpis = useMemo(() => {
    if (!performance) return null;
    return [
      {
        label: "Net PnL",
        value: performance.global.netPnl.toFixed(2),
        positive: performance.global.netPnl >= 0,
      },
      {
        label: "Win Rate",
        value: `${performance.global.winRate.toFixed(2)}%`,
        positive: performance.global.winRate >= 50,
      },
      {
        label: "Profit Factor",
        value: performance.global.profitFactor.toFixed(2),
        positive: performance.global.profitFactor >= 1,
      },
      {
        label: "Expectancy",
        value: performance.global.expectancy.toFixed(2),
        positive: performance.global.expectancy >= 0,
      },
      {
        label: "Open Positions",
        value: String(performance.openPositions),
        positive: true,
      },
      {
        label: "Closed Trades",
        value: String(performance.global.totalTrades),
        positive: true,
      },
    ];
  }, [performance]);

  return (
    <div className="space-y-5">
      {status && !status.ready && (
        <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-200">
            Configuración pendiente
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
            {Object.entries(status.envs).map(([key, ok]) => (
              <div key={key} className={`rounded-lg border px-2 py-1.5 ${ok ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-rose-400/30 bg-rose-400/10 text-rose-200"}`}>
                {key.replace(/^NEXT_PUBLIC_/, "")}
              </div>
            ))}
            <div className={`rounded-lg border px-2 py-1.5 ${status.dbConnected ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-rose-400/30 bg-rose-400/10 text-rose-200"}`}>
              DB conectada
            </div>
            <div className={`rounded-lg border px-2 py-1.5 ${status.tablesReady ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-rose-400/30 bg-rose-400/10 text-rose-200"}`}>
              Tablas creadas
            </div>
          </div>
          <ul className="space-y-1">
            {status.nextSteps.map((step, i) => (
              <li key={i} className="text-xs text-amber-100">&bull; {step}</li>
            ))}
          </ul>
        </section>
      )}

      {status?.ready && (
        <section className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-4 py-2.5 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-200">Sistema configurado y listo para operar.</span>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Control de simulación
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <label className="space-y-1">
            <span className="text-xs text-slate-400">Capital inicial (USD)</span>
            <input
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#0e1538] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
              placeholder="10000"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-slate-400">Posiciones (estado)</span>
            <select
              value={positionsStatus}
              onChange={(e) =>
                setPositionsStatus(e.target.value as "open" | "closed" | "all")
              }
              className="w-full rounded-lg border border-white/15 bg-[#0e1538] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
            >
              <option value="all">all</option>
              <option value="open">open</option>
              <option value="closed">closed</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs text-slate-400">Límite posiciones</span>
            <input
              value={positionsLimit}
              onChange={(e) => setPositionsLimit(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#0e1538] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
              placeholder="50"
            />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-xs text-slate-400">
            Wallets iniciales (una por línea: address,network,label)
          </span>
          <textarea
            value={walletLines}
            onChange={(e) => setWalletLines(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-white/15 bg-[#0e1538] px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/40"
            placeholder="0xabc...,ethereum,alpha-1"
          />
        </label>

        <div className="flex flex-wrap gap-4 text-xs text-slate-300">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={resetState}
              onChange={(e) => setResetState(e.target.checked)}
            />
            Resetear estado de riesgo
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={runFirstCycle}
              onChange={(e) => setRunFirstCycle(e.target.checked)}
            />
            Ejecutar primer ciclo en bootstrap
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh cada 30s
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void bootstrapSimulation()}
            disabled={loadingBootstrap}
            className="rounded-lg bg-cyan-500/80 hover:bg-cyan-400 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-[#041025]"
          >
            {loadingBootstrap ? "Inicializando..." : "Inicializar simulación"}
          </button>
          <button
            type="button"
            onClick={() => void runCycle()}
            disabled={loadingCycle}
            className="rounded-lg bg-indigo-500/80 hover:bg-indigo-400 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white"
          >
            {loadingCycle ? "Ejecutando..." : "Run cycle ahora"}
          </button>
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={loadingData}
            className="rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 disabled:opacity-60 px-4 py-2 text-sm text-slate-100"
          >
            {loadingData ? "Actualizando..." : "Refrescar datos"}
          </button>
        </div>

        {lastAction && (
          <p className="text-xs rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-emerald-200">
            {lastAction}
          </p>
        )}
        {lastError && (
          <p className="text-xs rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-rose-200">
            {lastError}
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {kpis?.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-4"
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">{kpi.label}</p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                kpi.positive ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-[#131b43]/90 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Posiciones
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-left py-2 pr-3">Symbol</th>
                  <th className="text-left py-2 pr-3">Layer</th>
                  <th className="text-left py-2 pr-3">Estado</th>
                  <th className="text-left py-2 pr-3">Entry</th>
                  <th className="text-left py-2 pr-3">Exit</th>
                  <th className="text-left py-2 pr-3">PnL</th>
                  <th className="text-left py-2 pr-3">Abierto</th>
                </tr>
              </thead>
              <tbody>
                {positions?.positions?.length ? (
                  positions.positions.map((p) => (
                    <tr key={p.id} className="border-t border-white/5 text-slate-200">
                      <td className="py-2 pr-3">{p.symbol}</td>
                      <td className="py-2 pr-3">{p.layer}</td>
                      <td className="py-2 pr-3">{p.status}</td>
                      <td className="py-2 pr-3">{Number(p.entry_price ?? 0).toFixed(6)}</td>
                      <td className="py-2 pr-3">
                        {p.exit_price == null ? "-" : Number(p.exit_price).toFixed(6)}
                      </td>
                      <td
                        className={`py-2 pr-3 ${
                          Number(p.pnl_abs ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {p.pnl_abs == null ? "-" : Number(p.pnl_abs).toFixed(2)}
                      </td>
                      <td className="py-2 pr-3">
                        {new Date(p.opened_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 text-slate-400" colSpan={7}>
                      Sin posiciones para el filtro actual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Risk State
            </h3>
            <div className="mt-3 space-y-1 text-xs text-slate-300">
              <p>Capital: {performance?.riskState?.capital ?? "-"}</p>
              <p>PnL hoy: {performance?.riskState?.pnlToday ?? "-"}</p>
              <p>PnL semana: {performance?.riskState?.pnlThisWeek ?? "-"}</p>
              <p>Trades core hoy: {performance?.riskState?.tradesTodayCore ?? "-"}</p>
              <p>
                Trades satellite hoy:{" "}
                {performance?.riskState?.tradesTodaySatellite ?? "-"}
              </p>
              <p>
                Pausado:{" "}
                {performance?.riskState?.isPaused ? (
                  <span className="text-rose-300">
                    Sí ({performance?.riskState?.pauseReason ?? "sin motivo"})
                  </span>
                ) : (
                  <span className="text-emerald-300">No</span>
                )}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Último ciclo
            </h3>
            {lastCycle ? (
              <ul className="mt-3 space-y-1 text-xs text-slate-300">
                <li>Timestamp: {String(lastCycle.timestamp ?? "-")}</li>
                <li>Régimen: {String(lastCycle.regime ?? "-")}</li>
                <li>Trending pools: {lastCycle.poolsScanned ?? 0} escaneados → {lastCycle.tokensScanned ?? 0} candidatos</li>
                <li>Early pools: {lastCycle.earlyPoolsScanned ?? 0} escaneados → {lastCycle.earlyCandidates ?? 0} candidatos</li>
                <li>Señales con confluencia: {lastCycle.signalsGenerated ?? 0}</li>
                <li>Trades abiertos: {lastCycle.tradesOpened ?? 0}</li>
                <li>Trades cerrados: {lastCycle.tradesClosed ?? 0}</li>
                <li>Errores: {(lastCycle.errors ?? []).length}</li>
                {(lastCycle.errors ?? []).length > 0 && (
                  <li className="mt-2 space-y-1">
                    {(lastCycle.errors ?? []).map((e, i) => (
                      <p key={i} className="text-rose-300 break-all">{e}</p>
                    ))}
                  </li>
                )}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-slate-400">
                Aún no hay ejecución en esta sesión.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function parseWalletLines(raw: string): Array<{
  address: string;
  network?: string;
  label?: string;
}> {
  if (!raw.trim()) return [];

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [address, network, label] = line.split(",").map((part) => part?.trim());
      return {
        address: (address ?? "").toLowerCase(),
        network: network ? network.toLowerCase() : "ethereum",
        label: label || undefined,
      };
    })
    .filter((w) => Boolean(w.address));
}
