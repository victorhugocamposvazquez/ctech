import type { SupabaseClient } from "@supabase/supabase-js";

/** Mínimo de candidatos con desenlace para que un replay sea informativo. */
const MIN_TRACKED = 30;
/** Mínimo de candidatos que pasan un filtro para reportar sus métricas. */
const MIN_PASSED = 8;

export interface FilterVariant {
  name: string;
  description: string;
  minLiquidityUsd: number;
  minVolume24h: number;
  minScore: number | null;
  /** null = sin restricción de fuente. */
  src: "momentum" | "early" | null;
}

export interface VariantResult {
  variant: FilterVariant;
  /** Candidatos del universo que habrían pasado este filtro. */
  passed: number;
  /** De los que pasaron, cuántos tienen desenlace a 24h. */
  tracked: number;
  hitRate24h: number;
  avgPnl24h: number;
  medianPnl24h: number;
  /** % de los aceptados que murieron (rug). */
  deathRate: number;
  /** Mejor desenlace individual (captura de cola derecha). */
  bestPnl24h: number;
  worstPnl24h: number;
}

export interface ReplayReport {
  universeSize: number;
  trackedUniverse: number;
  /** Hit rate del universo completo (baseline sin filtros). */
  baselineHitRate24h: number;
  baselineAvgPnl24h: number;
  baselineDeathRate: number;
  variants: VariantResult[];
  note: string;
  computedAt: string;
}

/** Variantes predefinidas a comparar contra la configuración actual. */
const VARIANTS: FilterVariant[] = [
  {
    name: "actual_momentum",
    description: "Config actual momentum (liq>=10K, vol>=5K, score>=38)",
    minLiquidityUsd: 10_000,
    minVolume24h: 5_000,
    minScore: 38,
    src: "momentum",
  },
  {
    name: "actual_early",
    description: "Config actual early (liq>=25K, vol>=5K, score>=42)",
    minLiquidityUsd: 25_000,
    minVolume24h: 5_000,
    minScore: 42,
    src: "early",
  },
  {
    name: "estricto",
    description: "Filtros duros (liq>=50K, vol>=20K, score>=55)",
    minLiquidityUsd: 50_000,
    minVolume24h: 20_000,
    minScore: 55,
    src: null,
  },
  {
    name: "laxo",
    description: "Filtros laxos (liq>=5K, vol>=2K, sin score mínimo)",
    minLiquidityUsd: 5_000,
    minVolume24h: 2_000,
    minScore: null,
    src: null,
  },
  {
    name: "liquidez_alta",
    description: "Solo liquidez alta (liq>=100K), score libre",
    minLiquidityUsd: 100_000,
    minVolume24h: 5_000,
    minScore: null,
    src: null,
  },
];

interface OutcomeRow {
  src: string;
  score: number | null;
  reject_reason: string | null;
  liquidity_usd: number;
  volume_24h: number;
  pnl_pct_24h: number | null;
  token_died: boolean;
}

/**
 * ReplayEngine — re-ejecuta configuraciones de filtro alternativas sobre el
 * universo archivado COMPLETO (aceptados + rechazados, con desenlace medido).
 *
 * Responde sin sesgo de superviviente: "¿qué hit rate y PnL a 24h habría
 * tenido cada configuración?". Es la base empírica para recalibrar umbrales
 * sin esperar semanas de paper trading, y el insumo del walk-forward que
 * reactivará la calibración automática (congelada desde Fase 0).
 */
export class ReplayEngine {
  constructor(private supabase: SupabaseClient) {}

  async replay(userId: string): Promise<ReplayReport> {
    const { data } = await this.supabase
      .from("candidate_outcomes")
      .select(
        "src, score, reject_reason, liquidity_usd, volume_24h, pnl_pct_24h, token_died"
      )
      .eq("user_id", userId)
      .order("first_seen_at", { ascending: false })
      .limit(5000);

    const universe = (data ?? []) as OutcomeRow[];
    const tracked = universe.filter((r) => r.pnl_pct_24h != null);

    if (tracked.length < MIN_TRACKED) {
      return {
        universeSize: universe.length,
        trackedUniverse: tracked.length,
        baselineHitRate24h: 0,
        baselineAvgPnl24h: 0,
        baselineDeathRate: 0,
        variants: [],
        note: `Solo ${tracked.length} candidatos con desenlace a 24h (mínimo ${MIN_TRACKED}). El tracker mide ~25 por ciclo; en 1-2 días habrá muestra.`,
        computedAt: new Date().toISOString(),
      };
    }

    const baseline = summarize(tracked);

    const variants: VariantResult[] = [];
    for (const v of VARIANTS) {
      const passed = universe.filter((r) => passes(r, v));
      const passedTracked = passed.filter((r) => r.pnl_pct_24h != null);
      if (passedTracked.length < MIN_PASSED) continue;

      const s = summarize(passedTracked);
      variants.push({
        variant: v,
        passed: passed.length,
        tracked: passedTracked.length,
        hitRate24h: s.hitRate,
        avgPnl24h: s.avgPnl,
        medianPnl24h: s.medianPnl,
        deathRate: s.deathRate,
        bestPnl24h: s.best,
        worstPnl24h: s.worst,
      });
    }

    variants.sort((a, b) => b.avgPnl24h - a.avgPnl24h);

    return {
      universeSize: universe.length,
      trackedUniverse: tracked.length,
      baselineHitRate24h: baseline.hitRate,
      baselineAvgPnl24h: baseline.avgPnl,
      baselineDeathRate: baseline.deathRate,
      variants,
      note:
        "Replay sobre universo completo archivado (aceptados + rechazados). " +
        "Los desenlaces incluyen tokens muertos a -100% — sin sesgo de superviviente.",
      computedAt: new Date().toISOString(),
    };
  }
}

function passes(r: OutcomeRow, v: FilterVariant): boolean {
  if (v.src && r.src !== v.src) return false;
  if (Number(r.liquidity_usd) < v.minLiquidityUsd) return false;
  if (Number(r.volume_24h) < v.minVolume24h) return false;
  if (v.minScore != null) {
    // Los rechazados antes del cálculo de score no tienen score: para
    // variantes con umbral de score solo cuentan los que lo alcanzaron.
    if (r.score == null || Number(r.score) < v.minScore) return false;
  }
  return true;
}

function summarize(rows: OutcomeRow[]) {
  const pnls = rows.map((r) => Number(r.pnl_pct_24h));
  const sorted = [...pnls].sort((a, b) => a - b);
  const wins = pnls.filter((p) => p > 0).length;
  const deaths = rows.filter((r) => r.token_died).length;

  return {
    hitRate: round(wins / pnls.length),
    avgPnl: round(pnls.reduce((s, p) => s + p, 0) / pnls.length),
    medianPnl: round(sorted[Math.floor(sorted.length / 2)] ?? 0),
    deathRate: round(deaths / rows.length),
    best: round(Math.max(...pnls)),
    worst: round(Math.min(...pnls)),
  };
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}
