import type { SupabaseClient } from "@supabase/supabase-js";
import { DexScreenerClient } from "../market/dexscreener";
import type { CandidateSnapshot } from "./candidate-snapshot";

/** Máximo de candidatos nuevos registrados por ciclo (control de fila). */
const MAX_NEW_PER_CYCLE = 80;
/** Máximo de outcomes actualizados por ciclo (respeta rate limit DexScreener). */
const MAX_CHECKS_PER_CYCLE = 25;
/** Chequeos consecutivos sin par antes de declarar token muerto. */
const DEATH_THRESHOLD = 3;

const H24 = 24 * 3600_000;
const H72 = 72 * 3600_000;

/**
 * CandidateOutcomeTracker — mide el desenlace real de cada candidato
 * archivado (aceptado O rechazado) a 24h y 72h de su primera observación.
 *
 * Es la mitad que le faltaba al archivador: cycle_snapshots re-observa a
 * los tokens mientras siguen siendo trending, pero los que desaparecen
 * (la mayoría, y los más informativos) quedaban sin desenlace conocido.
 * Con esta tabla el ReplayEngine puede responder "¿qué habría pasado con
 * otros filtros?" usando el universo completo, no solo supervivientes.
 *
 * Token muerto (par desaparecido 3 chequeos) = -100%, consistente con
 * SignalOutcomeTracker y PositionManager.
 */
export class CandidateOutcomeTracker {
  private dex: DexScreenerClient;

  constructor(private supabase: SupabaseClient) {
    this.dex = new DexScreenerClient();
  }

  /**
   * Registra la primera observación de cada token nuevo del ciclo.
   * Idempotente: el unique (user, network, address) ignora repetidos.
   */
  async recordCandidates(
    userId: string,
    candidates: CandidateSnapshot[],
    regime: string
  ): Promise<void> {
    if (!candidates.length) return;

    const seen = new Set<string>();
    const rows = [];

    for (const c of candidates) {
      if (c.priceUsd <= 0) continue;
      const key = `${c.network}:${c.address}`;
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push({
        user_id: userId,
        token_address: c.address,
        network: c.network,
        symbol: c.symbol,
        src: c.src,
        regime,
        price_at_detection: c.priceUsd,
        liquidity_usd: c.liquidityUsd,
        volume_24h: c.vol.h24,
        score: c.score,
        reject_reason: c.reject,
        metrics: {
          vol: c.vol,
          pc: c.pc,
          txns: c.txns,
          buyers24h: c.buyers24h,
          sellers24h: c.sellers24h,
          pairCreatedAt: c.pairCreatedAt,
          fdv: c.fdv,
          marketCap: c.marketCap,
        },
      });

      if (rows.length >= MAX_NEW_PER_CYCLE) break;
    }

    if (!rows.length) return;

    await this.supabase
      .from("candidate_outcomes")
      .upsert(rows, {
        onConflict: "user_id,network,token_address",
        ignoreDuplicates: true,
      });
  }

  /**
   * Actualiza outcomes pendientes cuyas ventanas (24h/72h) ya vencieron.
   */
  async updatePending(userId: string): Promise<{ checked: number; updated: number }> {
    const now = Date.now();

    const { data: pending } = await this.supabase
      .from("candidate_outcomes")
      .select(
        "id, token_address, network, first_seen_at, price_at_detection, price_24h, price_72h, pair_missing_checks"
      )
      .eq("user_id", userId)
      .eq("fully_tracked", false)
      .lte("first_seen_at", new Date(now - H24).toISOString())
      .order("first_seen_at", { ascending: true })
      .limit(MAX_CHECKS_PER_CYCLE);

    if (!pending?.length) return { checked: 0, updated: 0 };

    let updated = 0;

    for (const row of pending) {
      const entryPrice = Number(row.price_at_detection);
      if (entryPrice <= 0) continue;

      const ageMs = now - new Date(row.first_seen_at as string).getTime();
      const due24 = row.price_24h == null && ageMs >= H24;
      const due72 = row.price_72h == null && ageMs >= H72;
      if (!due24 && !due72) continue;

      let pair;
      try {
        pair = await this.dex.getBestPair(
          row.network as string,
          row.token_address as string
        );
      } catch {
        continue; // error de API: reintentar en el próximo pase
      }

      const updates: Record<string, unknown> = {};

      if (!pair) {
        const misses = Number(row.pair_missing_checks ?? 0) + 1;
        if (misses >= DEATH_THRESHOLD) {
          // Token muerto: todas las ventanas pendientes a -100%
          if (row.price_24h == null) {
            updates.price_24h = 0;
            updates.pnl_pct_24h = -1;
          }
          if (row.price_72h == null) {
            updates.price_72h = 0;
            updates.pnl_pct_72h = -1;
          }
          updates.token_died = true;
          updates.fully_tracked = true;
        }
        updates.pair_missing_checks = misses;
        await this.supabase
          .from("candidate_outcomes")
          .update(updates)
          .eq("id", row.id);
        updated++;
        continue;
      }

      const price = parseFloat(pair.priceUsd) || 0;
      if (price <= 0) continue;

      if (due24) {
        updates.price_24h = price;
        updates.pnl_pct_24h = (price - entryPrice) / entryPrice;
      }
      if (due72) {
        updates.price_72h = price;
        updates.pnl_pct_72h = (price - entryPrice) / entryPrice;
      }
      if (row.pair_missing_checks) updates.pair_missing_checks = 0;

      const has72 = due72 || row.price_72h != null;
      if (has72) updates.fully_tracked = true;

      await this.supabase
        .from("candidate_outcomes")
        .update(updates)
        .eq("id", row.id);
      updated++;
    }

    return { checked: pending.length, updated };
  }
}
