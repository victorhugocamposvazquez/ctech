"use client";

import { useEffect, useState } from "react";

type GroupMetrics = {
  n: number;
  winRate: number;
  winRateCi95: [number, number];
  profitFactor: number;
  expectancyUsd: number;
  expectancyCi95: [number, number];
  expectancyCi95Conservative: [number, number];
  totalPnlUsd: number;
  avgWinUsd: number;
  avgLossUsd: number;
  maxDrawdownPct: number;
  independence: {
    tradingDays: number;
    avgTradesPerDay: number;
    effectiveN: number;
    dailyExpectancyCi95: [number, number];
  };
};

type EdgeVerdict = {
  status:
    | "insufficient_data"
    | "no_edge"
    | "inconclusive"
    | "promising"
    | "validated";
  statusReason: string;
  global: GroupMetrics;
  byLayer: Record<string, GroupMetrics>;
  bySource: Record<string, GroupMetrics>;
  sample: {
    cleanTrades: number;
    minTradesForVerdict: number;
    firstCleanTradeAt: string | null;
    lastCleanTradeAt: string | null;
    tradesPerDay: number;
    estimatedDaysToVerdict: number | null;
  };
  computedAt: string;
};

const STATUS_UI: Record<
  EdgeVerdict["status"],
  { label: string; badge: string; border: string }
> = {
  insufficient_data: {
    label: "Muestra insuficiente",
    badge: "bg-slate-400/15 text-slate-200 border-slate-400/30",
    border: "border-white/10",
  },
  no_edge: {
    label: "Sin edge (significativo)",
    badge: "bg-rose-400/15 text-rose-200 border-rose-400/30",
    border: "border-rose-400/30",
  },
  inconclusive: {
    label: "Inconcluyente",
    badge: "bg-slate-400/15 text-slate-200 border-slate-400/30",
    border: "border-white/10",
  },
  promising: {
    label: "Prometedor (sin demostrar)",
    badge: "bg-amber-400/15 text-amber-200 border-amber-400/30",
    border: "border-amber-400/30",
  },
  validated: {
    label: "Edge validado",
    badge: "bg-emerald-400/15 text-emerald-200 border-emerald-400/30",
    border: "border-emerald-400/30",
  },
};

export default function EdgeVerdictPanel() {
  const [data, setData] = useState<EdgeVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/validation/edge");
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
        Error cargando veredicto de edge: {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-slate-400">Calculando veredicto de edge...</div>;
  }

  const ui = STATUS_UI[data.status];
  const progressPct = Math.min(
    100,
    Math.round((data.sample.cleanTrades / data.sample.minTradesForVerdict) * 100)
  );

  return (
    <div className={`rounded-2xl border ${ui.border} bg-[#131b43]/90 p-5 space-y-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold text-white">
          Veredicto de edge (Fase 1)
        </h2>
        <span
          className={`rounded-full border px-3 py-0.5 text-xs font-medium ${ui.badge}`}
        >
          {ui.label}
        </span>
        <span className="text-xs text-slate-400">
          solo datos limpios post-Fase 0
        </span>
      </div>

      <p className="text-sm text-slate-300">{data.statusReason}</p>

      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>
            {data.sample.cleanTrades} / {data.sample.minTradesForVerdict} trades
            limpios para veredicto
          </span>
          {data.sample.estimatedDaysToVerdict != null &&
            data.sample.estimatedDaysToVerdict > 0 && (
              <span>~{data.sample.estimatedDaysToVerdict} días al ritmo actual</span>
            )}
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-sky-400/70"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {data.global.n > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric
            label="Expectancia / trade"
            value={`${fmtUsd(data.global.expectancyUsd)}`}
            sub={`IC95 conservador [${fmtUsd(data.global.expectancyCi95Conservative[0])}, ${fmtUsd(data.global.expectancyCi95Conservative[1])}] · ${data.global.independence.tradingDays} días · nₑ=${data.global.independence.effectiveN}`}
            tone={
              data.global.expectancyCi95Conservative[0] > 0
                ? "good"
                : data.global.expectancyCi95Conservative[1] < 0
                  ? "bad"
                  : undefined
            }
          />
          <Metric
            label="Profit factor"
            value={data.global.profitFactor.toFixed(2)}
            sub={data.global.profitFactor >= 1.3 ? ">= 1.30 objetivo" : "objetivo 1.30"}
            tone={data.global.profitFactor >= 1.3 ? "good" : undefined}
          />
          <Metric
            label="Win rate"
            value={`${(data.global.winRate * 100).toFixed(0)}%`}
            sub={`IC95 [${(data.global.winRateCi95[0] * 100).toFixed(0)}%, ${(data.global.winRateCi95[1] * 100).toFixed(0)}%]`}
          />
          <Metric
            label="PnL total limpio"
            value={fmtUsd(data.global.totalPnlUsd)}
            sub={`maxDD ${(data.global.maxDrawdownPct * 100).toFixed(1)}%`}
            tone={
              data.global.totalPnlUsd > 0
                ? "good"
                : data.global.totalPnlUsd < 0
                  ? "bad"
                  : undefined
            }
          />
        </div>
      )}

      {(Object.keys(data.bySource).length > 0 ||
        Object.keys(data.byLayer).length > 0) && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-white/10">
                <th className="text-left py-2 pr-3 font-medium">Segmento</th>
                <th className="text-right py-2 px-3 font-medium">n</th>
                <th className="text-right py-2 px-3 font-medium">Win rate</th>
                <th className="text-right py-2 px-3 font-medium">PF</th>
                <th className="text-right py-2 px-3 font-medium">Expectancia</th>
                <th className="text-right py-2 pl-3 font-medium">IC95 expectancia</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {Object.entries(data.byLayer).map(([k, m]) => (
                <SegmentRow key={`layer-${k}`} name={`Layer · ${k}`} m={m} />
              ))}
              {Object.entries(data.bySource).map(([k, m]) => (
                <SegmentRow key={`src-${k}`} name={`Señal · ${k}`} m={m} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SegmentRow({ name, m }: { name: string; m: GroupMetrics }) {
  const ciPositive = m.expectancyCi95Conservative[0] > 0;
  const ciNegative = m.expectancyCi95Conservative[1] < 0;
  return (
    <tr className="border-b border-white/5">
      <td className="py-2 pr-3">{name}</td>
      <td className="py-2 px-3 text-right">{m.n}</td>
      <td className="py-2 px-3 text-right">{(m.winRate * 100).toFixed(0)}%</td>
      <td className="py-2 px-3 text-right">{m.profitFactor.toFixed(2)}</td>
      <td
        className={`py-2 px-3 text-right ${
          ciPositive ? "text-emerald-300" : ciNegative ? "text-rose-300" : ""
        }`}
      >
        {fmtUsd(m.expectancyUsd)}
      </td>
      <td className="py-2 pl-3 text-right text-slate-400">
        [{fmtUsd(m.expectancyCi95Conservative[0])}, {fmtUsd(m.expectancyCi95Conservative[1])}]
      </td>
    </tr>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p
        className={`mt-0.5 text-lg font-semibold ${
          tone === "good"
            ? "text-emerald-300"
            : tone === "bad"
              ? "text-rose-300"
              : "text-white"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

function fmtUsd(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}$${v.toFixed(Math.abs(v) < 10 ? 3 : 2)}`;
}
