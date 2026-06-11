"use client";

import { useEffect, useState } from "react";

type DecayReport = {
  samples: number;
  medianDecayPct: number;
  p90AdverseMovePct: number;
  fomoCostPct: number;
  delayedEntryDiscountPct: number;
  estimatedAlphaLossPerCyclePct: number;
  note: string;
  computedAt: string;
};

export default function SignalDecayPanel() {
  const [data, setData] = useState<DecayReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/validation/decay");
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
        Error cargando decay de señal: {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-slate-400">Calculando decay de señal...</div>;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-5 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-white">
          Decay de señal (granularidad 15 min)
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Cuánto se mueve el precio entre detección y el ciclo siguiente.
          Mide el alfa que perdemos por no entrar en tiempo real.
        </p>
      </div>

      <p className="text-sm text-slate-300">{data.note}</p>

      {data.samples > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MiniMetric label="Muestras" value={String(data.samples)} />
          <MiniMetric
            label="Mediana movimiento"
            value={`${data.medianDecayPct > 0 ? "+" : ""}${data.medianDecayPct}%`}
            tone={data.medianDecayPct > 3 ? "warn" : undefined}
          />
          <MiniMetric
            label="Alfa perdido / ciclo"
            value={`+${data.estimatedAlphaLossPerCyclePct}%`}
            tone={data.estimatedAlphaLossPerCyclePct > 5 ? "warn" : undefined}
          />
          <MiniMetric
            label="FOMO cost (>+5%)"
            value={`${data.fomoCostPct}%`}
          />
          <MiniMetric
            label="Entrada más barata (<-5%)"
            value={`${data.delayedEntryDiscountPct}%`}
          />
          <MiniMetric
            label="P90 movimiento adverso"
            value={`+${data.p90AdverseMovePct}%`}
          />
        </div>
      )}
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
