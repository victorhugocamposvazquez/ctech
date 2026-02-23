import type { SupabaseClient } from "@supabase/supabase-js";
import { DexScreenerClient } from "../market/dexscreener";
import type { ConfluenceResult } from "./confluence-engine";

const CHECK_WINDOWS = [
  { field: "price_1h", pnlField: "pnl_pct_1h", minAgeMs: 1 * 3600_000 },
  { field: "price_6h", pnlField: "pnl_pct_6h", minAgeMs: 6 * 3600_000 },
  { field: "price_24h", pnlField: "pnl_pct_24h", minAgeMs: 24 * 3600_000 },
  { field: "price_48h", pnlField: "pnl_pct_48h", minAgeMs: 48 * 3600_000 },
  { field: "price_7d", pnlField: "pnl_pct_7d", minAgeMs: 7 * 24 * 3600_000 },
] as const;

type SignalOutcomeRow = {
  id: string;
  token_address: string;
  network: string;
  entry_price: number;
  created_at: string;
  checks_done: number;
  price_1h: number | null;
  price_6h: number | null;
  price_24h: number | null;
  price_48h: number | null;
  price_7d: number | null;
};

export class SignalOutcomeTracker {
  private dex: DexScreenerClient;

  constructor(private supabase: SupabaseClient) {
    this.dex = new DexScreenerClient();
  }

  async recordSignal(
    userId: string,
    conf: ConfluenceResult,
    wasExecuted: boolean,
    rejectReason: string | null,
    regime: string
  ): Promise<void> {
    await this.supabase.from("signal_outcomes").insert({
      user_id: userId,
      symbol: conf.token,
      token_address: conf.tokenAddress,
      network: conf.network,
      layer: conf.layer,
      confidence: conf.confidence,
      regime,
      entry_price: conf.sources.momentum?.price ?? 0,
      liquidity_usd: conf.sources.momentum?.liquidityUsd ?? 0,
      volume_24h: conf.sources.momentum?.volume24h ?? 0,
      momentum_score: conf.sources.momentum?.momentumScore ?? 0,
      health_score: conf.sources.tokenHealth?.healthScore ?? null,
      was_executed: wasExecuted,
      reject_reason: rejectReason,
      reasons: conf.reasons,
      metadata: {
        momentumTier: conf.sources.momentum?.tier,
        walletConfluence: conf.sources.walletConfluence
          ? {
              count: conf.sources.walletConfluence.walletCount,
              avgScore: conf.sources.walletConfluence.avgWalletScore,
            }
          : null,
      },
    });
  }

  /**
   * Revisa señales pendientes de tracking y actualiza sus precios
   * según el tiempo transcurrido desde la generación.
   */
  async updatePendingOutcomes(): Promise<{ checked: number; updated: number }> {
    const { data: pending } = await this.supabase
      .from("signal_outcomes")
      .select(
        "id, token_address, network, entry_price, created_at, checks_done, price_1h, price_6h, price_24h, price_48h, price_7d"
      )
      .eq("fully_tracked", false)
      .order("created_at", { ascending: true })
      .limit(50);

    if (!pending?.length) return { checked: 0, updated: 0 };

    let updated = 0;

    for (const row of pending as SignalOutcomeRow[]) {
      const ageMs = Date.now() - new Date(row.created_at).getTime();
      const entryPrice = Number(row.entry_price);
      if (entryPrice <= 0) continue;

      let currentPrice: number | null = null;
      const updates: Record<string, unknown> = {};
      let newChecksDone = row.checks_done;
      let allFilled = true;

      for (const win of CHECK_WINDOWS) {
        const existing = row[win.field as keyof SignalOutcomeRow];
        if (existing != null) continue;

        if (ageMs < win.minAgeMs) {
          allFilled = false;
          continue;
        }

        if (currentPrice === null) {
          try {
            const pair = await this.dex.getBestPair(row.network, row.token_address);
            currentPrice = pair ? parseFloat(pair.priceUsd) || 0 : 0;
          } catch {
            allFilled = false;
            break;
          }
        }

        if (currentPrice > 0) {
          updates[win.field] = currentPrice;
          updates[win.pnlField] = (currentPrice - entryPrice) / entryPrice;
          newChecksDone++;
        } else {
          allFilled = false;
        }
      }

      if (Object.keys(updates).length === 0 && !allFilled) continue;

      updates.checks_done = newChecksDone;
      if (allFilled && newChecksDone >= CHECK_WINDOWS.length) {
        updates.fully_tracked = true;
      }

      await this.supabase
        .from("signal_outcomes")
        .update(updates)
        .eq("id", row.id);

      updated++;
    }

    return { checked: pending.length, updated };
  }

  async getValidationSummary(userId: string): Promise<ValidationSummary> {
    const { data: outcomes } = await this.supabase
      .from("signal_outcomes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!outcomes?.length) {
      return emptyValidation();
    }

    const total = outcomes.length;
    const executed = outcomes.filter((o) => o.was_executed).length;
    const withPrice24h = outcomes.filter((o) => o.pnl_pct_24h != null);
    const withPrice7d = outcomes.filter((o) => o.pnl_pct_7d != null);

    return {
      totalSignals: total,
      signalsExecuted: executed,
      signalsRejected: total - executed,

      hitRate1h: calcHitRate(outcomes, "pnl_pct_1h"),
      hitRate6h: calcHitRate(outcomes, "pnl_pct_6h"),
      hitRate24h: calcHitRate(outcomes, "pnl_pct_24h"),
      hitRate48h: calcHitRate(outcomes, "pnl_pct_48h"),
      hitRate7d: calcHitRate(outcomes, "pnl_pct_7d"),

      avgPnl1h: calcAvg(outcomes, "pnl_pct_1h"),
      avgPnl6h: calcAvg(outcomes, "pnl_pct_6h"),
      avgPnl24h: calcAvg(outcomes, "pnl_pct_24h"),
      avgPnl48h: calcAvg(outcomes, "pnl_pct_48h"),
      avgPnl7d: calcAvg(outcomes, "pnl_pct_7d"),

      byLayer: {
        core: calcLayerMetrics(outcomes.filter((o) => o.layer === "core")),
        satellite: calcLayerMetrics(
          outcomes.filter((o) => o.layer === "satellite")
        ),
      },

      byRegime: {
        risk_on: calcLayerMetrics(outcomes.filter((o) => o.regime === "risk_on")),
        risk_off: calcLayerMetrics(
          outcomes.filter((o) => o.regime === "risk_off")
        ),
        neutral: calcLayerMetrics(outcomes.filter((o) => o.regime === "neutral")),
      },

      trackedSignals: withPrice24h.length,
      fullyTracked: withPrice7d.length,
      pendingTracking: total - withPrice7d.length,

      recentSignals: outcomes.slice(0, 20).map((o) => ({
        id: o.id,
        symbol: o.symbol,
        layer: o.layer,
        confidence: Number(o.confidence),
        regime: o.regime,
        entryPrice: Number(o.entry_price),
        wasExecuted: o.was_executed,
        rejectReason: o.reject_reason,
        pnlPct1h: o.pnl_pct_1h != null ? Number(o.pnl_pct_1h) : null,
        pnlPct6h: o.pnl_pct_6h != null ? Number(o.pnl_pct_6h) : null,
        pnlPct24h: o.pnl_pct_24h != null ? Number(o.pnl_pct_24h) : null,
        pnlPct7d: o.pnl_pct_7d != null ? Number(o.pnl_pct_7d) : null,
        createdAt: o.created_at,
      })),
    };
  }
}

export interface ValidationSummary {
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

  byLayer: {
    core: LayerValidation;
    satellite: LayerValidation;
  };
  byRegime: {
    risk_on: LayerValidation;
    risk_off: LayerValidation;
    neutral: LayerValidation;
  };

  trackedSignals: number;
  fullyTracked: number;
  pendingTracking: number;

  recentSignals: RecentSignal[];
}

export interface LayerValidation {
  count: number;
  hitRate24h: number;
  avgPnl24h: number;
}

export interface RecentSignal {
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
}

function calcHitRate(
  outcomes: Array<Record<string, unknown>>,
  field: string
): number {
  const valid = outcomes.filter((o) => o[field] != null);
  if (valid.length === 0) return 0;
  const wins = valid.filter((o) => Number(o[field]) > 0).length;
  return Math.round((wins / valid.length) * 10000) / 100;
}

function calcAvg(
  outcomes: Array<Record<string, unknown>>,
  field: string
): number {
  const valid = outcomes.filter((o) => o[field] != null);
  if (valid.length === 0) return 0;
  const sum = valid.reduce((s, o) => s + Number(o[field]), 0);
  return Math.round((sum / valid.length) * 10000) / 100;
}

function calcLayerMetrics(
  outcomes: Array<Record<string, unknown>>
): LayerValidation {
  return {
    count: outcomes.length,
    hitRate24h: calcHitRate(outcomes, "pnl_pct_24h"),
    avgPnl24h: calcAvg(outcomes, "pnl_pct_24h"),
  };
}

function emptyValidation(): ValidationSummary {
  const emptyLayer: LayerValidation = { count: 0, hitRate24h: 0, avgPnl24h: 0 };
  return {
    totalSignals: 0,
    signalsExecuted: 0,
    signalsRejected: 0,
    hitRate1h: 0,
    hitRate6h: 0,
    hitRate24h: 0,
    hitRate48h: 0,
    hitRate7d: 0,
    avgPnl1h: 0,
    avgPnl6h: 0,
    avgPnl24h: 0,
    avgPnl48h: 0,
    avgPnl7d: 0,
    byLayer: { core: emptyLayer, satellite: emptyLayer },
    byRegime: { risk_on: emptyLayer, risk_off: emptyLayer, neutral: emptyLayer },
    trackedSignals: 0,
    fullyTracked: 0,
    pendingTracking: 0,
    recentSignals: [],
  };
}
