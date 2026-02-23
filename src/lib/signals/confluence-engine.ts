import type { SupabaseClient } from "@supabase/supabase-js";
import type { MomentumSignal } from "./momentum-detector";
import type { RegimeSnapshot } from "../market/regime-detector";
import type { TokenHealthResult } from "../market/token-health";
import type { OrderRequest, Layer } from "../engine/types";

export interface ConfluenceResult {
  token: string;
  tokenAddress: string;
  network: string;
  layer: Layer;
  confidence: number;
  reasons: string[];
  order: OrderRequest;
  sources: {
    momentum: MomentumSignal | null;
    walletConfluence: WalletConfluenceInfo | null;
    tokenHealth: TokenHealthResult | null;
    regime: RegimeSnapshot | null;
  };
}

export interface WalletConfluenceInfo {
  walletCount: number;
  avgWalletScore: number;
  totalAmountUsd: number;
  walletIds: string[];
}

export interface ConfluenceConfig {
  minMomentumScore: number;
  minTokenHealth: number;
  minWalletsForConfluence: number;
  minWalletScoreForConfluence: number;
  confluenceWindowHours: number;
  coreMinConfidence: number;
  satelliteMinConfidence: number;
}

const DEFAULT_CONFIG: ConfluenceConfig = {
  minMomentumScore: 55,
  minTokenHealth: 60,
  minWalletsForConfluence: 3,
  minWalletScoreForConfluence: 70,
  confluenceWindowHours: 6,
  coreMinConfidence: 75,
  satelliteMinConfidence: 50,
};

/**
 * ConfluenceEngine — cerebro de decisión del sistema.
 *
 * Combina señales de múltiples fuentes independientes y decide:
 *  1. ¿Hay señal suficiente para operar?
 *  2. ¿En qué layer (Core/Satellite)?
 *  3. ¿Con qué nivel de confianza?
 *
 * Fuentes de señal (por prioridad):
 *  1. MomentumDetector (DexScreener, $0) — señal principal
 *  2. Wallet confluence (Arkham, opcional) — confirmación
 *  3. Token health (DexScreener + Arkham, $0-$$) — filtro
 *  4. Market regime (Fear & Greed, $0) — modulador
 *
 * Una señal pasa si tiene suficiente confidence (0-100).
 */
export class ConfluenceEngine {
  private config: ConfluenceConfig;

  constructor(
    private supabase: SupabaseClient,
    private userId: string,
    config?: Partial<ConfluenceConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async evaluate(
    momentum: MomentumSignal,
    tokenHealth: TokenHealthResult | null,
    regime: RegimeSnapshot | null
  ): Promise<ConfluenceResult | null> {
    const reasons: string[] = [];
    let confidence = 0;

    // --- Capa 1: Momentum (max 40 pts) ---
    if (momentum.momentumScore >= 80) {
      confidence += 40;
      reasons.push(`Momentum fuerte (${momentum.momentumScore})`);
    } else if (momentum.momentumScore >= 65) {
      confidence += 30;
      reasons.push(`Momentum moderado (${momentum.momentumScore})`);
    } else if (momentum.momentumScore >= this.config.minMomentumScore) {
      confidence += 18;
      reasons.push(`Momentum débil (${momentum.momentumScore})`);
    } else {
      return null;
    }

    // --- Capa 2: Wallet confluence (max 25 pts) ---
    const walletConf = await this.checkWalletConfluence(
      momentum.tokenAddress,
      momentum.network
    );
    if (walletConf) {
      if (walletConf.walletCount >= 5) {
        confidence += 25;
        reasons.push(`${walletConf.walletCount} wallets buenas comprando (score avg ${walletConf.avgWalletScore.toFixed(0)})`);
      } else if (walletConf.walletCount >= this.config.minWalletsForConfluence) {
        confidence += 18;
        reasons.push(`${walletConf.walletCount} wallets comprando (score avg ${walletConf.avgWalletScore.toFixed(0)})`);
      }
    }

    // --- Capa 3: Token health (max 20 pts) ---
    if (tokenHealth) {
      if (tokenHealth.healthScore >= 80) {
        confidence += 20;
        reasons.push(`Token muy sano (${tokenHealth.healthScore})`);
      } else if (tokenHealth.healthScore >= this.config.minTokenHealth) {
        confidence += 12;
        reasons.push(`Token aceptable (${tokenHealth.healthScore})`);
      } else {
        confidence -= 10;
        reasons.push(`Token con riesgo (${tokenHealth.healthScore})`);
      }

      if (tokenHealth.contractRiskFlags.length > 0) {
        confidence -= tokenHealth.contractRiskFlags.length * 5;
        reasons.push(`Risk flags: ${tokenHealth.contractRiskFlags.join(", ")}`);
      }
    }

    // --- Capa 4: Market regime (max 15 pts / penalización) ---
    if (regime) {
      if (regime.regime === "risk_on") {
        confidence += 15;
        reasons.push("Mercado risk-on");
      } else if (regime.regime === "neutral") {
        confidence += 5;
        reasons.push("Mercado neutral");
      } else {
        confidence -= 15;
        reasons.push("Mercado risk-off — penalización");
      }
    }

    confidence = Math.max(0, Math.min(100, confidence));

    // --- Decisión ---
    if (confidence < this.config.satelliteMinConfidence) {
      return null;
    }

    const layer: Layer =
      confidence >= this.config.coreMinConfidence ? "core" : "satellite";

    const order: OrderRequest = {
      userId: this.userId,
      symbol: momentum.tokenSymbol,
      tokenAddress: momentum.tokenAddress,
      network: momentum.network,
      side: "buy",
      amountUsd: 0, // RiskGate asigna el tamaño real
      layer,
      executionMode: "paper",
      entryReason: reasons.join(" | "),
      tokenHealthScoreAtEntry: tokenHealth?.healthScore,
      walletScoreAtEntry: walletConf?.avgWalletScore,
      metadata: {
        momentumScore: momentum.momentumScore,
        momentumTier: momentum.tier,
        confidence,
        walletConfluence: walletConf
          ? { count: walletConf.walletCount, avgScore: walletConf.avgWalletScore }
          : null,
        regime: regime?.regime ?? "unknown",
      },
    };

    return {
      token: momentum.tokenSymbol,
      tokenAddress: momentum.tokenAddress,
      network: momentum.network,
      layer,
      confidence,
      reasons,
      order,
      sources: {
        momentum,
        walletConfluence: walletConf,
        tokenHealth,
        regime,
      },
    };
  }

  /**
   * Comprueba si múltiples wallets con buen score han comprado
   * el mismo token en las últimas N horas.
   */
  private async checkWalletConfluence(
    tokenAddress: string,
    network: string
  ): Promise<WalletConfluenceInfo | null> {
    const windowStart = new Date(
      Date.now() - this.config.confluenceWindowHours * 60 * 60 * 1000
    ).toISOString();

    const { data: movements } = await this.supabase
      .from("wallet_movements")
      .select(`
        wallet_id,
        amount_usd,
        tracked_wallets!inner (
          id
        )
      `)
      .ilike("token_address", tokenAddress)
      .eq("network", network)
      .eq("direction", "buy")
      .gte("detected_at", windowStart);

    if (!movements || movements.length === 0) return null;

    const uniqueWalletIds = [...new Set(movements.map((m) => m.wallet_id))];

    const scores: number[] = [];
    for (const wId of uniqueWalletIds) {
      const { data: scoreRow } = await this.supabase
        .from("wallet_scores")
        .select("overall_score")
        .eq("wallet_id", wId)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .single();

      if (
        scoreRow?.overall_score &&
        scoreRow.overall_score >= this.config.minWalletScoreForConfluence
      ) {
        scores.push(scoreRow.overall_score);
      }
    }

    if (scores.length < this.config.minWalletsForConfluence) return null;

    const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
    const totalUsd = movements.reduce((s, m) => s + Number(m.amount_usd ?? 0), 0);

    return {
      walletCount: scores.length,
      avgWalletScore: avgScore,
      totalAmountUsd: totalUsd,
      walletIds: uniqueWalletIds,
    };
  }
}
