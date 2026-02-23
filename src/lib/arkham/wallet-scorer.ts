import type { SupabaseClient } from "@supabase/supabase-js";

interface MovementPair {
  tokenAddress: string;
  tokenSymbol: string;
  buyAmountUsd: number;
  buyAt: Date;
  sellAmountUsd: number | null;
  sellAt: Date | null;
  pnlUsd: number | null;
  pnlPct: number | null;
  isClosed: boolean;
}

export interface WalletScoreResult {
  walletId: string;
  periodStart: Date;
  periodEnd: Date;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  avgPnlPct: number;
  maxDrawdownPct: number;
  consistencyScore: number;
  overallScore: number;
}

const MIN_TRADES_FOR_SCORE = 5;

/**
 * WalletScorer — calcula el rendimiento histórico de una wallet
 * a partir de sus movimientos registrados.
 *
 * Empareja compras y ventas del mismo token para estimar PnL.
 * Genera un score compuesto (0-100) que el sistema usa como umbral
 * para decidir si copiar a esa wallet.
 */
export class WalletScorer {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Calcula y persiste el score de una wallet para un periodo dado.
   */
  async scoreWallet(
    walletId: string,
    periodDays = 30
  ): Promise<WalletScoreResult | null> {
    const periodEnd = new Date();
    const periodStart = new Date(
      periodEnd.getTime() - periodDays * 24 * 60 * 60 * 1000
    );

    const movements = await this.getMovements(walletId, periodStart, periodEnd);
    if (movements.length < MIN_TRADES_FOR_SCORE) return null;

    const pairs = this.pairMovements(movements);
    const closedPairs = pairs.filter((p) => p.isClosed);

    if (closedPairs.length < MIN_TRADES_FOR_SCORE) return null;

    const wins = closedPairs.filter((p) => (p.pnlUsd ?? 0) > 0);
    const losses = closedPairs.filter((p) => (p.pnlUsd ?? 0) <= 0);

    const winRate = closedPairs.length > 0 ? wins.length / closedPairs.length : 0;

    const totalProfit = wins.reduce((s, p) => s + (p.pnlUsd ?? 0), 0);
    const totalLoss = Math.abs(losses.reduce((s, p) => s + (p.pnlUsd ?? 0), 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 10 : 0;

    const pnlPcts = closedPairs
      .map((p) => p.pnlPct ?? 0)
      .filter((v) => isFinite(v));
    const avgPnlPct =
      pnlPcts.length > 0 ? pnlPcts.reduce((s, v) => s + v, 0) / pnlPcts.length : 0;

    const maxDrawdownPct = this.calcMaxDrawdown(closedPairs);
    const consistencyScore = this.calcConsistency(closedPairs);

    const overallScore = this.calcOverallScore({
      winRate,
      profitFactor,
      avgPnlPct,
      maxDrawdownPct,
      consistencyScore,
      totalTrades: closedPairs.length,
    });

    const result: WalletScoreResult = {
      walletId,
      periodStart,
      periodEnd,
      totalTrades: closedPairs.length,
      winRate,
      profitFactor,
      avgPnlPct,
      maxDrawdownPct,
      consistencyScore,
      overallScore,
    };

    await this.persistScore(result);

    return result;
  }

  /**
   * Recalcula scores de todas las wallets activas de un usuario.
   */
  async scoreAllWallets(
    userId: string,
    periodDays = 30
  ): Promise<WalletScoreResult[]> {
    const { data: wallets } = await this.supabase
      .from("tracked_wallets")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const results: WalletScoreResult[] = [];
    for (const w of wallets ?? []) {
      const score = await this.scoreWallet(w.id, periodDays);
      if (score) results.push(score);
    }

    return results;
  }

  // --------------- Helpers ---------------

  private pairMovements(
    movements: { token_address: string; token_symbol: string; direction: string; amount_usd: number; detected_at: string }[]
  ): MovementPair[] {
    const byToken = new Map<string, typeof movements>();

    for (const m of movements) {
      const key = m.token_address.toLowerCase();
      if (!byToken.has(key)) byToken.set(key, []);
      byToken.get(key)!.push(m);
    }

    const pairs: MovementPair[] = [];

    for (const [, tokenMovements] of byToken) {
      const sorted = [...tokenMovements].sort(
        (a, b) => new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime()
      );

      const buys = sorted.filter((m) => m.direction === "buy");
      const sells = sorted.filter((m) => m.direction === "sell");

      for (let i = 0; i < buys.length; i++) {
        const buy = buys[i];
        const sell = sells[i] ?? null;

        const buyUsd = buy.amount_usd;
        const sellUsd = sell?.amount_usd ?? null;
        const pnlUsd = sellUsd !== null ? sellUsd - buyUsd : null;
        const pnlPct = pnlUsd !== null && buyUsd > 0 ? pnlUsd / buyUsd : null;

        pairs.push({
          tokenAddress: buy.token_address,
          tokenSymbol: buy.token_symbol,
          buyAmountUsd: buyUsd,
          buyAt: new Date(buy.detected_at),
          sellAmountUsd: sellUsd,
          sellAt: sell ? new Date(sell.detected_at) : null,
          pnlUsd,
          pnlPct,
          isClosed: sell !== null,
        });
      }
    }

    return pairs;
  }

  private calcMaxDrawdown(pairs: MovementPair[]): number {
    let peak = 0;
    let cumulative = 0;
    let maxDd = 0;

    for (const p of pairs) {
      cumulative += p.pnlPct ?? 0;
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDd) maxDd = dd;
    }

    return maxDd;
  }

  private calcConsistency(pairs: MovementPair[]): number {
    if (pairs.length < 3) return 0;

    const pnls = pairs.map((p) => p.pnlPct ?? 0);
    const mean = pnls.reduce((s, v) => s + v, 0) / pnls.length;
    const variance = pnls.reduce((s, v) => s + (v - mean) ** 2, 0) / pnls.length;
    const stddev = Math.sqrt(variance);

    if (stddev === 0) return mean > 0 ? 100 : 0;

    const cv = Math.abs(stddev / mean);
    return Math.max(0, Math.min(100, 100 - cv * 20));
  }

  /**
   * Score compuesto 0-100.
   * Ponderación: winRate 20%, profitFactor 25%, avgPnlPct 15%,
   *              maxDrawdown 20%, consistencia 15%, volumen trades 5%.
   */
  private calcOverallScore(params: {
    winRate: number;
    profitFactor: number;
    avgPnlPct: number;
    maxDrawdownPct: number;
    consistencyScore: number;
    totalTrades: number;
  }): number {
    const wrScore = Math.min(params.winRate * 100, 100);
    const pfScore = Math.min(params.profitFactor * 20, 100);
    const pnlScore = Math.min(Math.max(params.avgPnlPct * 500 + 50, 0), 100);
    const ddScore = Math.max(100 - params.maxDrawdownPct * 200, 0);
    const volScore = Math.min(params.totalTrades * 2, 100);

    return Math.round(
      wrScore * 0.2 +
      pfScore * 0.25 +
      pnlScore * 0.15 +
      ddScore * 0.2 +
      params.consistencyScore * 0.15 +
      volScore * 0.05
    );
  }

  private async getMovements(
    walletId: string,
    from: Date,
    to: Date
  ) {
    const { data, error } = await this.supabase
      .from("wallet_movements")
      .select("token_address, token_symbol, direction, amount_usd, detected_at")
      .eq("wallet_id", walletId)
      .gte("detected_at", from.toISOString())
      .lte("detected_at", to.toISOString())
      .order("detected_at", { ascending: true });

    if (error) {
      console.error("[WalletScorer] Error obteniendo movimientos:", error.message);
      return [];
    }

    return data ?? [];
  }

  private async persistScore(result: WalletScoreResult): Promise<void> {
    const { error } = await this.supabase.from("wallet_scores").insert({
      wallet_id: result.walletId,
      period_start: result.periodStart.toISOString(),
      period_end: result.periodEnd.toISOString(),
      total_trades: result.totalTrades,
      win_rate: result.winRate,
      profit_factor: result.profitFactor,
      avg_pnl_pct: result.avgPnlPct,
      max_drawdown_pct: result.maxDrawdownPct,
      consistency_score: result.consistencyScore,
      overall_score: result.overallScore,
    });

    if (error) {
      console.error("[WalletScorer] Error persistiendo score:", error.message);
    }
  }
}
