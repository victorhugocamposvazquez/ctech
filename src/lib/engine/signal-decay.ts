import type { SupabaseClient } from "@supabase/supabase-js";
import type { CandidateSnapshot } from "../signals/candidate-snapshot";

/** Ventana máxima para emparejar dos snapshots del mismo token (ms). */
const MATCH_WINDOW_MS = 20 * 60_000;
const MIN_DECAY_SAMPLES = 5;

export interface SignalDecayReport {
  /** Muestras con precio posterior dentro de la ventana. */
  samples: number;
  /** Mediana de cambio de precio entre detección y siguiente ciclo (%). */
  medianDecayPct: number;
  /** Percentil 90 del movimiento adverso (pérdida de alfa por retraso). */
  p90AdverseMovePct: number;
  /** % de muestras donde el precio subió >5% antes de poder entrar (FOMO cost). */
  fomoCostPct: number;
  /** % donde el precio cayó >5% (entrada más barata por retraso). */
  delayedEntryDiscountPct: number;
  /** Estimación conservadora de alfa perdido por ciclo de 15 min. */
  estimatedAlphaLossPerCyclePct: number;
  note: string;
  computedAt: string;
}

/**
 * Mide el decay de señal entre ciclos usando el archivador histórico.
 *
 * Compara el precio de un candidato aceptado (reject=null) con el precio
 * del mismo token en el snapshot del ciclo siguiente (≤20 min). Esto
 * cuantifica cuánto alfa se pierde por la granularidad de 15 minutos
 * y justifica (o no) un carril de entrada más rápido en Fase 2.
 */
export class SignalDecayAnalyzer {
  constructor(private supabase: SupabaseClient) {}

  async analyze(userId: string): Promise<SignalDecayReport> {
    const { data: rows } = await this.supabase
      .from("cycle_snapshots")
      .select("timestamp, candidates")
      .eq("user_id", userId)
      .order("timestamp", { ascending: true })
      .limit(200);

    if (!rows?.length) {
      return emptyReport("Sin snapshots todavía — el archivador acumula datos con cada ciclo.");
    }

    type Obs = { ts: number; priceUsd: number };
    const byToken = new Map<string, Obs[]>();

    for (const row of rows) {
      const ts = new Date(row.timestamp as string).getTime();
      const candidates = (row.candidates as CandidateSnapshot[]) ?? [];
      for (const c of candidates) {
        if (c.reject != null || c.priceUsd <= 0) continue;
        const key = `${c.network}:${c.address}`;
        const list = byToken.get(key) ?? [];
        list.push({ ts, priceUsd: c.priceUsd });
        byToken.set(key, list);
      }
    }

    const decayPcts: number[] = [];

    for (const [, obs] of byToken) {
      obs.sort((a, b) => a.ts - b.ts);
      for (let i = 0; i < obs.length - 1; i++) {
        const cur = obs[i];
        for (let j = i + 1; j < obs.length; j++) {
          const next = obs[j];
          const dt = next.ts - cur.ts;
          if (dt > MATCH_WINDOW_MS) break;
          if (dt < 5 * 60_000) continue;

          const decayPct = ((next.priceUsd - cur.priceUsd) / cur.priceUsd) * 100;
          decayPcts.push(decayPct);
          break;
        }
      }
    }

    if (decayPcts.length < MIN_DECAY_SAMPLES) {
      return emptyReport(
        `Solo ${decayPcts.length} emparejamientos (mínimo ${MIN_DECAY_SAMPLES}). ` +
          "Seguir acumulando ciclos con candidatos aceptados."
      );
    }

    const sorted = [...decayPcts].sort((a, b) => a - b);
    const median = percentile(sorted, 50);
    const p90Adverse = percentile(
      sorted.filter((d) => d < 0).map((d) => Math.abs(d)),
      90
    );
    const fomoCost =
      (decayPcts.filter((d) => d > 5).length / decayPcts.length) * 100;
    const delayedDiscount =
      (decayPcts.filter((d) => d < -5).length / decayPcts.length) * 100;

    // Alfa perdido: si el precio sube antes de entrar, perdemos upside;
    // si cae, ganamos descuento — usamos la mediana del movimiento adverso.
    const adverseMoves = decayPcts.filter((d) => d > 0);
    const estimatedAlphaLoss =
      adverseMoves.length > 0
        ? percentile(
            adverseMoves.sort((a, b) => a - b),
            50
          )
        : 0;

    return {
      samples: decayPcts.length,
      medianDecayPct: round1(median),
      p90AdverseMovePct: round1(p90Adverse),
      fomoCostPct: round1(fomoCost),
      delayedEntryDiscountPct: round1(delayedDiscount),
      estimatedAlphaLossPerCyclePct: round1(estimatedAlphaLoss),
      note:
        "Decay medido entre snapshots consecutivos (~15 min). " +
        "Valores positivos = precio subió antes de poder entrar (alfa perdido).",
      computedAt: new Date().toISOString(),
    };
  }
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function emptyReport(note: string): SignalDecayReport {
  return {
    samples: 0,
    medianDecayPct: 0,
    p90AdverseMovePct: 0,
    fomoCostPct: 0,
    delayedEntryDiscountPct: 0,
    estimatedAlphaLossPerCyclePct: 0,
    note,
    computedAt: new Date().toISOString(),
  };
}
