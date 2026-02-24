// ============================================================
// SmartMoneySimulator — synthetic wallet activity for signals
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export interface SimulatedWallet {
  id: string;
  label: string;
  style: "alpha" | "momentum" | "early_sniper" | "whale";
  winRate: number;
  avgHoldHours: number;
  preferredNetworks: string[];
  reactionTimeMs: number;
}

export interface SimulatedMovement {
  walletId: string;
  tokenAddress: string;
  tokenSymbol: string;
  network: string;
  direction: "buy";
  amountUsd: number;
  score: number;
}

const SIMULATED_WALLETS: SimulatedWallet[] = [
  {
    id: "sim-alpha-1",
    label: "Alpha Whale",
    style: "alpha",
    winRate: 0.72,
    avgHoldHours: 24,
    preferredNetworks: ["ethereum", "base"],
    reactionTimeMs: 30_000,
  },
  {
    id: "sim-alpha-2",
    label: "DeFi OG",
    style: "alpha",
    winRate: 0.68,
    avgHoldHours: 48,
    preferredNetworks: ["ethereum", "arbitrum"],
    reactionTimeMs: 60_000,
  },
  {
    id: "sim-sniper-1",
    label: "Early Sniper",
    style: "early_sniper",
    winRate: 0.55,
    avgHoldHours: 4,
    preferredNetworks: ["solana", "base"],
    reactionTimeMs: 5_000,
  },
  {
    id: "sim-sniper-2",
    label: "Degen Scout",
    style: "early_sniper",
    winRate: 0.48,
    avgHoldHours: 6,
    preferredNetworks: ["solana", "base", "arbitrum"],
    reactionTimeMs: 10_000,
  },
  {
    id: "sim-momentum-1",
    label: "Trend Surfer",
    style: "momentum",
    winRate: 0.62,
    avgHoldHours: 12,
    preferredNetworks: ["ethereum", "base", "arbitrum", "solana"],
    reactionTimeMs: 45_000,
  },
  {
    id: "sim-whale-1",
    label: "Patient Whale",
    style: "whale",
    winRate: 0.60,
    avgHoldHours: 72,
    preferredNetworks: ["ethereum"],
    reactionTimeMs: 120_000,
  },
];

/**
 * SmartMoneySimulator generates deterministic simulated wallet activity
 * for tokens being evaluated by the system.
 *
 * Instead of relying on Arkham API, it creates synthetic "smart money"
 * buying patterns that the ConfluenceEngine can detect through the
 * standard wallet_movements table.
 *
 * Activity is deterministic per (token, date) using a seeded hash,
 * so running the same cycle twice on the same day yields identical results.
 *
 * Wallet behavior depends on:
 *  - Token characteristics (momentum score, is early, network)
 *  - Wallet style preferences (alpha prefers high momentum,
 *    snipers prefer early tokens, etc.)
 *  - Probability derived from token quality + wallet preference match
 */
export class SmartMoneySimulator {
  private wallets: SimulatedWallet[];

  constructor() {
    this.wallets = SIMULATED_WALLETS;
  }

  simulateActivity(
    tokenAddress: string,
    tokenSymbol: string,
    network: string,
    momentumOrEarlyScore: number,
    isEarly: boolean
  ): SimulatedMovement[] {
    const movements: SimulatedMovement[] = [];
    const dateKey = new Date().toISOString().slice(0, 10);

    for (const wallet of this.wallets) {
      if (!wallet.preferredNetworks.includes(network)) continue;

      const styleMatch = this.calcStyleMatch(wallet, isEarly, momentumOrEarlyScore);
      const seed = hash(`${wallet.id}:${tokenAddress}:${dateKey}`);
      const rand = seedToFloat(seed);

      const threshold = 0.7 - styleMatch * 0.4;

      if (rand > threshold) {
        const baseAmount = isEarly ? 500 : 2000;
        const scoreMultiplier = momentumOrEarlyScore / 100;
        const amountUsd = baseAmount * (0.5 + scoreMultiplier * 1.5) * (0.8 + rand * 0.4);

        movements.push({
          walletId: wallet.id,
          tokenAddress,
          tokenSymbol,
          network,
          direction: "buy",
          amountUsd: Math.round(amountUsd * 100) / 100,
          score: wallet.winRate * 100,
        });
      }
    }

    return movements;
  }

  async persistMovements(
    supabase: SupabaseClient,
    userId: string,
    movements: SimulatedMovement[]
  ): Promise<number> {
    if (movements.length === 0) return 0;

    const walletIds = [...new Set(movements.map((m) => m.walletId))];

    for (const wId of walletIds) {
      const wallet = this.wallets.find((w) => w.id === wId);
      if (!wallet) continue;

      await supabase.from("tracked_wallets").upsert(
        {
          user_id: userId,
          address: wId,
          network: "multi",
          label: `[SIM] ${wallet.label}`,
          category: wallet.style === "early_sniper" ? "early" : wallet.style === "alpha" ? "alpha" : "momentum",
          source: "manual",
          is_active: true,
        },
        { onConflict: "user_id,address,network", ignoreDuplicates: true }
      );
    }

    const { data: walletRows } = await supabase
      .from("tracked_wallets")
      .select("id, address")
      .eq("user_id", userId)
      .in(
        "address",
        walletIds
      );

    const addressToId = new Map(
      (walletRows ?? []).map((r: { id: string; address: string }) => [r.address, r.id])
    );

    await this.ensureWalletScores(supabase, walletRows ?? []);

    const rows = movements
      .filter((m) => addressToId.has(m.walletId))
      .map((m) => ({
        wallet_id: addressToId.get(m.walletId)!,
        token_address: m.tokenAddress,
        token_symbol: m.tokenSymbol,
        network: m.network,
        direction: m.direction,
        amount_usd: m.amountUsd,
        metadata: { source: "simulated", score: m.score },
      }));

    if (rows.length > 0) {
      await supabase.from("wallet_movements").insert(rows);
    }

    return rows.length;
  }

  /**
   * Garantiza que cada wallet simulada tenga un wallet_score >= 70
   * para que checkWalletConfluence pueda detectar confluencia.
   */
  private async ensureWalletScores(
    supabase: SupabaseClient,
    walletRows: { id: string; address: string }[]
  ): Promise<void> {
    const now = new Date();
    const periodEnd = now.toISOString();
    const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    for (const row of walletRows) {
      const wallet = this.wallets.find((w) => w.id === row.address);
      if (!wallet) continue;

      const { data: existing } = await supabase
        .from("wallet_scores")
        .select("id")
        .eq("wallet_id", row.id)
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      const overallScore = Math.max(70, Math.round(wallet.winRate * 100));
      await supabase.from("wallet_scores").insert({
        wallet_id: row.id,
        period_start: periodStart,
        period_end: periodEnd,
        total_trades: 0,
        win_rate: wallet.winRate,
        profit_factor: 1.5,
        avg_pnl_pct: 5,
        max_drawdown_pct: 8,
        consistency_score: overallScore,
        overall_score: overallScore,
      });
    }
  }

  private calcStyleMatch(
    wallet: SimulatedWallet,
    isEarly: boolean,
    score: number
  ): number {
    const normalized = score / 100;

    if (isEarly && (wallet.style === "early_sniper" || wallet.style === "alpha")) {
      return 0.7 + normalized * 0.3;
    }
    if (!isEarly && (wallet.style === "momentum" || wallet.style === "whale")) {
      return 0.5 + normalized * 0.5;
    }
    if (!isEarly && wallet.style === "alpha") {
      return 0.4 + normalized * 0.4;
    }
    return 0.2 + normalized * 0.2;
  }
}

function hash(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function seedToFloat(hexSeed: string): number {
  const sub = hexSeed.slice(0, 8);
  return parseInt(sub, 16) / 0xffffffff;
}
