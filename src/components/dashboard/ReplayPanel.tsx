"use client";

import { useEffect, useState } from "react";

type VariantResult = {
  variant: {
    name: string;
    description: string;
  };
  passed: number;
  tracked: number;
  hitRate24h: number;
  avgPnl24h: number;
  medianPnl24h: number;
  deathRate: number;
  bestPnl24h: number;
  worstPnl24h: number;
};

type ReplayReport = {
  universeSize: number;
  trackedUniverse: number;
  baselineHitRate24h: number;
  baselineAvgPnl24h: number;
  baselineDeathRate: number;
  variants: VariantResult[];
  note: string;
  computedAt: string;
};

export default function ReplayPanel() {
  const [data, setData] = useState<ReplayReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/validation/replay");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm text-rose-200">
        Error cargando replay de filtros: {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-slate-400">Calculando replay de filtros...</div>;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-5 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-white">
          Replay de filtros (universo completo)
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Qué habría pasado con configuraciones alternativas, medido sobre
          todos los candidatos archivados — incluidos los rechazados y los
          que murieron.
        </p>
      </div>

      <p className="text-sm text-slate-300">{data.note}</p>

      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        <span>Universo: {data.universeSize} tokens</span>
        <span>Con desenlace 24h: {data.trackedUniverse}</span>
        {data.trackedUniverse > 0 && (
          <>
            <span>
              Baseline sin filtros: hit {fmtPct(data.baselineHitRate24h)} · PnL
              medio {fmtPct(data.baselineAvgPnl24h)}
            </span>
            <span>Muertes: {fmtPct(data.baselineDeathRate)}</span>
          </>
        )}
      </div>

      {data.variants.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-white/10">
                <th className="text-left py-2 pr-3 font-medium">Variante</th>
                <th className="text-right py-2 px-3 font-medium">Pasan</th>
                <th className="text-right py-2 px-3 font-medium">Hit 24h</th>
                <th className="text-right py-2 px-3 font-medium">PnL medio</th>
                <th className="text-right py-2 px-3 font-medium">Mediana</th>
                <th className="text-right py-2 px-3 font-medium">Muertes</th>
                <th className="text-right py-2 pl-3 font-medium">Mejor / Peor</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {data.variants.map((v) => (
                <tr key={v.variant.name} className="border-b border-white/5">
                  <td className="py-2 pr-3" title={v.variant.description}>
                    {v.variant.name}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {v.tracked}/{v.passed}
                  </td>
                  <td className="py-2 px-3 text-right">{fmtPct(v.hitRate24h)}</td>
                  <td
                    className={`py-2 px-3 text-right ${
                      v.avgPnl24h > 0
                        ? "text-emerald-300"
                        : v.avgPnl24h < 0
                          ? "text-rose-300"
                          : ""
                    }`}
                  >
                    {fmtPct(v.avgPnl24h)}
                  </td>
                  <td className="py-2 px-3 text-right">{fmtPct(v.medianPnl24h)}</td>
                  <td className="py-2 px-3 text-right">{fmtPct(v.deathRate)}</td>
                  <td className="py-2 pl-3 text-right text-slate-400">
                    {fmtPct(v.bestPnl24h)} / {fmtPct(v.worstPnl24h)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function fmtPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${(v * 100).toFixed(1)}%`;
}
