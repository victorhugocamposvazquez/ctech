"use client";

import { useEffect, useState } from "react";

type LayerValidation = {
  count: number;
  hitRate24h: number;
  avgPnl24h: number;
};

type RecentSignal = {
  id: string;
  symbol: string;
  layer: string;
  confidence: number;
  regime: string;
  entryPrice: number;
  wasExecuted: boolean;
  rejectReason: string | null;
  pnlPct1h: number | null;
  pnlPct6h: number | null;
  pnlPct24h: number | null;
  pnlPct7d: number | null;
  createdAt: string;
};

type ValidationData = {
  totalSignals: number;
  signalsExecuted: number;
  signalsRejected: number;
  hitRate1h: number;
  hitRate6h: number;
  hitRate24h: number;
  hitRate48h: number;
  hitRate7d: number;
  avgPnl1h: number;
  avgPnl6h: number;
  avgPnl24h: number;
  avgPnl48h: number;
  avgPnl7d: number;
  byLayer: { core: LayerValidation; satellite: LayerValidation };
  byRegime: {
    risk_on: LayerValidation;
    risk_off: LayerValidation;
    neutral: LayerValidation;
  };
  trackedSignals: number;
  fullyTracked: number;
  pendingTracking: number;
  recentSignals: RecentSignal[];
};

export default function ValidationConsole() {
  const [data, setData] = useState<ValidationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/validation");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm text-rose-200">
        Error cargando validación: {error}
        <button
          type="button"
          onClick={() => void refresh()}
          className="ml-3 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="text-sm text-slate-400">Cargando validación...</div>
    );
  }

  const noData = data.totalSignals === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {data.totalSignals} señales totales · {data.trackedSignals} con
          precio 24h · {data.fullyTracked} completas · {data.pendingTracking}{" "}
          pendientes
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs text-slate-100"
        >
          Refrescar
        </button>
      </div>

      {noData ? (
        <div className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-8 text-center">
          <p className="text-sm text-slate-300">
            Aún no hay señales registradas.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Ejecuta ciclos desde Simulación para que el motor empiece a generar
            y trackear señales.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <HitRateCard label="1h" hitRate={data.hitRate1h} avgPnl={data.avgPnl1h} />
            <HitRateCard label="6h" hitRate={data.hitRate6h} avgPnl={data.avgPnl6h} />
            <HitRateCard label="24h" hitRate={data.hitRate24h} avgPnl={data.avgPnl24h} />
            <HitRateCard label="48h" hitRate={data.hitRate48h} avgPnl={data.avgPnl48h} />
            <HitRateCard label="7d" hitRate={data.hitRate7d} avgPnl={data.avgPnl7d} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Por layer (24h)
              </h3>
              <div className="mt-3 space-y-2">
                <LayerRow label="Core" data={data.byLayer.core} />
                <LayerRow label="Satellite" data={data.byLayer.satellite} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Por régimen (24h)
              </h3>
              <div className="mt-3 space-y-2">
                <LayerRow label="Risk On" data={data.byRegime.risk_on} />
                <LayerRow label="Neutral" data={data.byRegime.neutral} />
                <LayerRow label="Risk Off" data={data.byRegime.risk_off} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Señales recientes
              </h3>
              <div className="flex gap-3 text-xs text-slate-400">
                <span>Ejecutadas: {data.signalsExecuted}</span>
                <span>Rechazadas: {data.signalsRejected}</span>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th className="text-left py-2 pr-3">Token</th>
                    <th className="text-left py-2 pr-3">Layer</th>
                    <th className="text-left py-2 pr-3">Conf.</th>
                    <th className="text-left py-2 pr-3">Reg.</th>
                    <th className="text-left py-2 pr-3">Exec</th>
                    <th className="text-left py-2 pr-3">1h</th>
                    <th className="text-left py-2 pr-3">6h</th>
                    <th className="text-left py-2 pr-3">24h</th>
                    <th className="text-left py-2 pr-3">7d</th>
                    <th className="text-left py-2 pr-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSignals.map((s) => (
                    <tr
                      key={s.id}
                      className="border-t border-white/5 text-slate-200"
                    >
                      <td className="py-2 pr-3 font-medium">{s.symbol}</td>
                      <td className="py-2 pr-3">{s.layer}</td>
                      <td className="py-2 pr-3">{s.confidence}</td>
                      <td className="py-2 pr-3">{s.regime ?? "-"}</td>
                      <td className="py-2 pr-3">
                        {s.wasExecuted ? (
                          <span className="text-emerald-300">Sí</span>
                        ) : (
                          <span
                            className="text-rose-300 cursor-help"
                            title={s.rejectReason ?? ""}
                          >
                            No
                          </span>
                        )}
                      </td>
                      <PnlCell value={s.pnlPct1h} />
                      <PnlCell value={s.pnlPct6h} />
                      <PnlCell value={s.pnlPct24h} />
                      <PnlCell value={s.pnlPct7d} />
                      <td className="py-2 pr-3 text-slate-400">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function HitRateCard({
  label,
  hitRate,
  avgPnl,
}: {
  label: string;
  hitRate: number;
  avgPnl: number;
}) {
  const hitColor = hitRate >= 55 ? "text-emerald-300" : hitRate >= 45 ? "text-amber-300" : "text-rose-300";
  const pnlColor = avgPnl >= 0 ? "text-emerald-300" : "text-rose-300";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">
        Hit Rate {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${hitColor}`}>
        {hitRate.toFixed(1)}%
      </p>
      <p className={`mt-0.5 text-xs ${pnlColor}`}>
        Avg PnL: {avgPnl >= 0 ? "+" : ""}{avgPnl.toFixed(2)}%
      </p>
    </div>
  );
}

function LayerRow({ label, data }: { label: string; data: LayerValidation }) {
  if (data.count === 0) {
    return (
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>sin datos</span>
      </div>
    );
  }

  const hitColor = data.hitRate24h >= 55 ? "text-emerald-300" : data.hitRate24h >= 45 ? "text-amber-300" : "text-rose-300";
  const pnlColor = data.avgPnl24h >= 0 ? "text-emerald-300" : "text-rose-300";

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-300">{label} ({data.count})</span>
      <div className="flex gap-4">
        <span className={hitColor}>
          HR: {data.hitRate24h.toFixed(1)}%
        </span>
        <span className={pnlColor}>
          Avg: {data.avgPnl24h >= 0 ? "+" : ""}{data.avgPnl24h.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function PnlCell({ value }: { value: number | null }) {
  if (value == null) {
    return <td className="py-2 pr-3 text-slate-500">-</td>;
  }
  const pct = (value * 100).toFixed(1);
  const color = value >= 0 ? "text-emerald-300" : "text-rose-300";
  return (
    <td className={`py-2 pr-3 ${color}`}>
      {value >= 0 ? "+" : ""}{pct}%
    </td>
  );
}
