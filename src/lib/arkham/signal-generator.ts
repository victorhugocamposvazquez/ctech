import type { SupabaseClient } from "@supabase/supabase-js";
import type { DetectedMovement } from "./wallet-tracker";
import type { OrderRequest } from "../engine/types";

const DEFAULT_MIN_WALLET_SCORE = 70;
const DEFAULT_MIN_TOKEN_HEALTH = 65;
const DEFAULT_MIN_AMOUNT_USD = 500;

export interface SignalGeneratorConfig {
  minWalletScore: number;
  minTokenHealth: number;
  minAmountUsd: number;
}

export interface GeneratedSignal {
  movement: DetectedMovement;
  walletScore: number;
  tokenHealthScore: number | null;
  layer: "core" | "satellite";
  order: OrderRequest;
}

/**
 * SignalGenerator — convierte movimientos de wallets cualificadas
 * en señales operativas para el PaperBroker.
 *
 * Flujo:
 *  1. Recibe movimientos detectados del WalletTracker.
 *  2. Consulta el último wallet_score de la wallet.
 *  3. Consulta el último token_health_score del token.
 *  4. Si ambos superan umbrales → genera OrderRequest.
 *  5. Asigna layer (core si ambos scores altos, satellite si token arriesgado).
 */
export class SignalGenerator {
  private config: SignalGeneratorConfig;

  constructor(
    private supabase: SupabaseClient,
    private userId: string,
    config?: Partial<SignalGeneratorConfig>
  ) {
    this.config = {
      minWalletScore: config?.minWalletScore ?? DEFAULT_MIN_WALLET_SCORE,
      minTokenHealth: config?.minTokenHealth ?? DEFAULT_MIN_TOKEN_HEALTH,
      minAmountUsd: config?.minAmountUsd ?? DEFAULT_MIN_AMOUNT_USD,
    };
  }

  async processMovements(
    movements: DetectedMovement[]
  ): Promise<GeneratedSignal[]> {
    const signals: GeneratedSignal[] = [];

    for (const movement of movements) {
      const signal = await this.evaluate(movement);
      if (signal) {
        await this.persistSignal(signal);
        signals.push(signal);
      }
    }

    return signals;
  }

  private async evaluate(
    movement: DetectedMovement
  ): Promise<GeneratedSignal | null> {
    if (movement.direction !== "buy") return null;

    if (movement.amountUsd < this.config.minAmountUsd) return null;

    const walletScore = await this.getLatestWalletScore(movement.walletId);
    if (walletScore === null || walletScore < this.config.minWalletScore) {
      return null;
    }

    const tokenHealthScore = await this.getLatestTokenHealth(
      movement.tokenAddress,
      movement.network
    );

    const layer = this.assignLayer(walletScore, tokenHealthScore);

    if (layer === "core" && tokenHealthScore !== null && tokenHealthScore < this.config.minTokenHealth) {
      return null;
    }

    const order: OrderRequest = {
      userId: this.userId,
      symbol: movement.tokenSymbol,
      tokenAddress: movement.tokenAddress,
      network: movement.network,
      side: "buy",
      amountUsd: movement.amountUsd,
      layer,
      executionMode: "paper",
      entryReason: `Copy wallet ${movement.walletAddress.slice(0, 8)}... (score ${walletScore}) — ${movement.tokenSymbol} buy $${movement.amountUsd.toFixed(0)}`,
      walletMovementId: undefined, // se asigna tras persistir el movement
      tokenHealthScoreAtEntry: tokenHealthScore ?? undefined,
      walletScoreAtEntry: walletScore,
      metadata: {
        txHash: movement.txHash,
        walletCategory: undefined,
      },
    };

    return { movement, walletScore, tokenHealthScore, layer, order };
  }

  /**
   * Core si wallet_score >= 80 y token_health >= 65.
   * Satellite en todo lo demás que pase filtros mínimos.
   */
  private assignLayer(
    walletScore: number,
    tokenHealth: number | null
  ): "core" | "satellite" {
    if (walletScore >= 80 && tokenHealth !== null && tokenHealth >= this.config.minTokenHealth) {
      return "core";
    }
    return "satellite";
  }

  private async getLatestWalletScore(walletId: string): Promise<number | null> {
    const { data } = await this.supabase
      .from("wallet_scores")
      .select("overall_score")
      .eq("wallet_id", walletId)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .single();

    return data?.overall_score ?? null;
  }

  private async getLatestTokenHealth(
    tokenAddress: string,
    network: string
  ): Promise<number | null> {
    const { data: token } = await this.supabase
      .from("token_registry")
      .select("id")
      .eq("user_id", this.userId)
      .ilike("address", tokenAddress)
      .eq("network", network)
      .limit(1)
      .single();

    if (!token) return null;

    const { data: health } = await this.supabase
      .from("token_health_snapshots")
      .select("health_score")
      .eq("token_id", token.id)
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .single();

    return health?.health_score ?? null;
  }

  private async persistSignal(signal: GeneratedSignal): Promise<void> {
    const { error } = await this.supabase.from("signals").insert({
      user_id: this.userId,
      strategy_name: "arkham_copy",
      symbol: signal.movement.tokenSymbol,
      timeframe: "realtime",
      direction: signal.order.side,
      score: signal.walletScore,
      source: "arkham",
      metadata: {
        walletId: signal.movement.walletId,
        walletAddress: signal.movement.walletAddress,
        tokenAddress: signal.movement.tokenAddress,
        network: signal.movement.network,
        amountUsd: signal.movement.amountUsd,
        txHash: signal.movement.txHash,
        layer: signal.layer,
        tokenHealthScore: signal.tokenHealthScore,
        walletScore: signal.walletScore,
      },
    });

    if (error) {
      console.error("[SignalGenerator] Error persistiendo señal:", error.message);
    }
  }
}
