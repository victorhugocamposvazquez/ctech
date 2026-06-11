"use client";

import { useEffect, useState } from "react";

type ShortfallReport = {
  samples: number;
  comparable: number;
  noRouteCount: number;
  avgModelSlippagePct?: number;
  avgRealImpactPct?: number;
  medianDeltaPct?: number;
  p90DeltaPct?: number;
  realWorsePct?: number;
  note: string;
  computedAt: string;
};

export default function ShortfallPanel() {
  const [data, setData] = useState<ShortfallReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/validation/shortfall");
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
        Error cargando shortfall: {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-slate-400">Calculando shortfall paper→real...</div>;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-5 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-white">
          Shortfall paper→real (quotes sombra de Jupiter)
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          En cada entrada paper se captura la cotización real del agregador.
          Mide cuánto se desvía el modelo de slippage de la realidad — sin
          arriesgar dinero.
        </p>
      </div>

      <p className="text-sm text-slate-300">{data.note}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MiniMetric label="Quotes capturadas" value={String(data.samples)} />
        <MiniMetric label="Comparables" value={String(data.comparable)} />
        <MiniMetric
          label="Sin ruta en Jupiter"
          value={String(data.noRouteCount)}
          tone={data.noRouteCount > 0 ? "warn" : undefined}
        />
        {data.comparable > 0 && (
          <>
            <MiniMetric
              label="Slippage modelado (medio)"
              value={fmtPct(data.avgModelSlippagePct ?? 0)}
            />
            <MiniMetric
              label="Impacto real Jupiter (medio)"
              value={fmtPct(data.avgRealImpactPct ?? 0)}
            />
            <MiniMetric
              label="Realidad peor que modelo"
              value={fmtPct(data.realWorsePct ?? 0)}
              tone={(data.realWorsePct ?? 0) > 0.5 ? "warn" : undefined}
            />
          </>
        )}
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p
        className={`mt-0.5 text-base font-semibold ${
          tone === "warn" ? "text-amber-300" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}
