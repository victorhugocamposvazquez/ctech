import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * EdgeValidator — el veredicto de Fase 1.
 *
 * Responde con rigor estadístico a la única pregunta que importa antes de
 * arriesgar dinero real: ¿el sistema tiene edge demostrado o no?
 *
 * Principios:
 *  - SOLO datos limpios: excluye todo lo marcado metadata.preFase0=true
 *    (generado antes de la purga del SmartMoneySimulator, sin stops y sin
 *    fricción de salida — no apto para medir edge).
 *  - Intervalos de confianza, no medias sueltas: un win rate del 60% con
 *    n=10 no dice nada; el IC de Wilson y el IC-t de la expectancia lo
 *    hacen explícito.
 *  - Veredicto conservador: solo declara "validado" cuando el IC completo
 *    de la expectancia queda por encima de cero con muestra suficiente.
 */

export type EdgeVerdictStatus =
  | "insufficient_data" // n < MIN_TRADES_VERDICT: cualquier conclusión es ruido
  | "no_edge"           // IC de expectancia íntegramente < 0
  | "inconclusive"      // IC cruza 0 sin sesgo claro
  | "promising"         // media > 0 pero el IC aún cruza 0
  | "validated";        // IC íntegramente > 0 y PF >= umbral

export interface GroupEdgeMetrics {
  n: number;
  winRate: number;            // 0-1
  winRateCi95: [number, number];
  profitFactor: number;
  expectancyUsd: number;      // media PnL neto por trade
  expectancyCi95: [number, number];
  totalPnlUsd: number;
  avgWinUsd: number;
  avgLossUsd: number;
  maxDrawdownPct: number;     // 0-1 sobre curva de PnL acumulado
}

export interface EdgeVerdict {
  status: EdgeVerdictStatus;
  statusReason: string;
  global: GroupEdgeMetrics;
  byLayer: Record<string, GroupEdgeMetrics>;
  bySource: Record<string, GroupEdgeMetrics>;
  /** Progreso hacia la muestra mínima del veredicto. */
  sample: {
    cleanTrades: number;
    minTradesForVerdict: number;
    firstCleanTradeAt: string | null;
    lastCleanTradeAt: string | null;
    tradesPerDay: number;
    estimatedDaysToVerdict: number | null;
  };
  computedAt: string;
}

const MIN_TRADES_VERDICT = 60;
const MIN_TRADES_GROUP = 10;
const PF_VALIDATION_THRESHOLD = 1.3;
const Z95 = 1.96;

interface CleanTradeRow {
  pnl_abs: number | null;
  fees_abs: number | null;
  is_win: boolean | null;
  layer: string;
  closed_at: string;
  metadata: Record<string, unknown> | null;
}

export class EdgeValidator {
  constructor(private supabase: SupabaseClient) {}

  async validate(userId: string): Promise<EdgeVerdict> {
    // metadata->preFase0 es null en los trades generados tras la migración
    // de integridad; true en todo lo anterior (contaminado).
    const { data } = await this.supabase
      .from("trades")
      .select("pnl_abs, fees_abs, is_win, layer, closed_at, metadata")
      .eq("user_id", userId)
      .eq("status", "closed")
      .eq("execution_mode", "paper")
      .is("metadata->preFase0", null)
      .order("closed_at", { ascending: true })
      .limit(5000);

    const trades = (data ?? []) as CleanTradeRow[];

    const global = computeGroup(trades);

    const byLayer: Record<string, GroupEdgeMetrics> = {};
    for (const layer of ["core", "satellite"]) {
      const subset = trades.filter((t) => t.layer === layer);
      if (subset.length >= MIN_TRADES_GROUP) byLayer[layer] = computeGroup(subset);
    }

    const bySource: Record<string, GroupEdgeMetrics> = {};
    const sources = new Set(
      trades.map((t) => String(t.metadata?.signalSource ?? "unknown"))
    );
    for (const src of sources) {
      const subset = trades.filter(
        (t) => String(t.metadata?.signalSource ?? "unknown") === src
      );
      if (subset.length >= MIN_TRADES_GROUP) bySource[src] = computeGroup(subset);
    }

    const firstAt = trades[0]?.closed_at ?? null;
    const lastAt = trades[trades.length - 1]?.closed_at ?? null;
    const spanDays =
      firstAt && lastAt
        ? Math.max(
            (new Date(lastAt).getTime() - new Date(firstAt).getTime()) / 86_400_000,
            1 / 24
          )
        : 0;
    const tradesPerDay = spanDays > 0 ? trades.length / spanDays : 0;
    const remaining = Math.max(0, MIN_TRADES_VERDICT - trades.length);
    const estimatedDaysToVerdict =
      remaining === 0 ? 0 : tradesPerDay > 0 ? Math.ceil(remaining / tradesPerDay) : null;

    const { status, statusReason } = deriveVerdict(trades.length, global);

    return {
      status,
      statusReason,
      global,
      byLayer,
      bySource,
      sample: {
        cleanTrades: trades.length,
        minTradesForVerdict: MIN_TRADES_VERDICT,
        firstCleanTradeAt: firstAt,
        lastCleanTradeAt: lastAt,
        tradesPerDay: round(tradesPerDay),
        estimatedDaysToVerdict,
      },
      computedAt: new Date().toISOString(),
    };
  }
}

function deriveVerdict(
  n: number,
  g: GroupEdgeMetrics
): { status: EdgeVerdictStatus; statusReason: string } {
  if (n < MIN_TRADES_VERDICT) {
    return {
      status: "insufficient_data",
      statusReason: `Solo ${n} trades limpios de los ${MIN_TRADES_VERDICT} mínimos. Cualquier métrica con esta muestra es ruido — seguir acumulando.`,
    };
  }

  const [lo, hi] = g.expectancyCi95;

  if (hi < 0) {
    return {
      status: "no_edge",
      statusReason: `La expectancia es negativa con un 95% de confianza (IC [${lo.toFixed(3)}, ${hi.toFixed(3)}] $/trade). El sistema pierde dinero de forma estadísticamente significativa: NO escalar, revisar señales.`,
    };
  }

  if (lo > 0 && g.profitFactor >= PF_VALIDATION_THRESHOLD) {
    return {
      status: "validated",
      statusReason: `Expectancia positiva con 95% de confianza (IC [${lo.toFixed(3)}, ${hi.toFixed(3)}] $/trade) y profit factor ${g.profitFactor.toFixed(2)} >= ${PF_VALIDATION_THRESHOLD}. Edge demostrado en esta muestra — apto para considerar capital real pequeño.`,
    };
  }

  if (lo > 0) {
    return {
      status: "promising",
      statusReason: `Expectancia positiva con 95% de confianza pero profit factor ${g.profitFactor.toFixed(2)} < ${PF_VALIDATION_THRESHOLD}. Edge real pero fino: la fricción puede comérselo. Seguir en paper.`,
    };
  }

  if (g.expectancyUsd > 0) {
    return {
      status: "promising",
      statusReason: `Expectancia media positiva (${g.expectancyUsd.toFixed(3)} $/trade) pero el IC aún cruza cero (IC [${lo.toFixed(3)}, ${hi.toFixed(3)}]). Pinta bien, no está demostrado — seguir acumulando muestra.`,
    };
  }

  return {
    status: "inconclusive",
    statusReason: `Expectancia ~0 (IC [${lo.toFixed(3)}, ${hi.toFixed(3)}] $/trade). Sin señal clara en ninguna dirección con la muestra actual.`,
  };
}

function computeGroup(trades: CleanTradeRow[]): GroupEdgeMetrics {
  const pnls = trades.map((t) => num(t.pnl_abs) - num(t.fees_abs));
  const n = pnls.length;

  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const winRate = n > 0 ? wins.length / n : 0;

  const grossProfit = wins.reduce((s, p) => s + p, 0);
  const grossLoss = Math.abs(losses.reduce((s, p) => s + p, 0));
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 10 : 0;

  const mean = n > 0 ? pnls.reduce((s, p) => s + p, 0) / n : 0;
  const variance =
    n > 1 ? pnls.reduce((s, p) => s + (p - mean) ** 2, 0) / (n - 1) : 0;
  const sem = n > 1 ? Math.sqrt(variance / n) : 0;

  let peak = 0;
  let cum = 0;
  let maxDD = 0;
  for (const p of pnls) {
    cum += p;
    if (cum > peak) peak = cum;
    const dd = peak > 0 ? (peak - cum) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }

  return {
    n,
    winRate: round(winRate),
    winRateCi95: wilsonCi(wins.length, n),
    profitFactor: round(profitFactor),
    expectancyUsd: round3(mean),
    expectancyCi95: [round3(mean - Z95 * sem), round3(mean + Z95 * sem)],
    totalPnlUsd: round(pnls.reduce((s, p) => s + p, 0)),
    avgWinUsd: round3(wins.length > 0 ? grossProfit / wins.length : 0),
    avgLossUsd: round3(losses.length > 0 ? -grossLoss / losses.length : 0),
    maxDrawdownPct: round(maxDD),
  };
}

/** Intervalo de Wilson al 95% para una proporción — fiable con n pequeño. */
function wilsonCi(successes: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  const p = successes / n;
  const z2 = Z95 * Z95;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (Z95 * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [round(Math.max(0, center - margin)), round(Math.min(1, center + margin))];
}

function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0) || 0;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
