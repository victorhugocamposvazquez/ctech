import type { SupabaseClient } from "@supabase/supabase-js";
import type { MomentumSignal } from "./momentum-detector";
import type { EarlySignal } from "./early-detector";
import type { RegimeSnapshot } from "../market/regime-detector";
import type { TokenHealthResult } from "../market/token-health";
import type { OrderRequest, Layer } from "../engine/types";

export type SignalSource = "momentum" | "early";

export interface ConfluenceResult {
  token: string;
  tokenAddress: string;
  network: string;
  layer: Layer;
  confidence: number;
  reasons: string[];
  signalSource: SignalSource;
  order: OrderRequest;
  sources: {
    momentum: MomentumSignal | null;
    early: EarlySignal | null;
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
  minEarlyScore: number;
  minTokenHealth: number;
  minTokenHealthEarly: number;
  minWalletsForConfluence: number;
  minWalletScoreForConfluence: number;
  confluenceWindowHours: number;
  coreMinConfidence: number;
  satelliteMinConfidence: number;
  earlyWalletBoostMultiplier: number;
}

const DEFAULT_CONFIG: ConfluenceConfig = {
  minMomentumScore: 45,
  minEarlyScore: 42,
  minTokenHealth: 60,
  minTokenHealthEarly: 35,
  minWalletsForConfluence: 3,
  minWalletScoreForConfluence: 70,
  confluenceWindowHours: 6,
  coreMinConfidence: 72,
  satelliteMinConfidence: 45,
  earlyWalletBoostMultiplier: 1.5,
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

  /**
   * Evalúa una señal de momentum (tokens trending → Core/Satellite).
   */
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
    confidence = this.applyRegime(confidence, regime, reasons);
    confidence = Math.max(0, Math.min(100, confidence));

    if (confidence < this.config.satelliteMinConfidence) return null;

    const layer: Layer =
      confidence >= this.config.coreMinConfidence ? "core" : "satellite";

    return this.buildResult(
      "momentum",
      momentum.tokenSymbol,
      momentum.tokenAddress,
      momentum.network,
      layer,
      confidence,
      reasons,
      tokenHealth,
      walletConf,
      regime,
      momentum,
      null,
      { momentumScore: momentum.momentumScore, momentumTier: momentum.tier }
    );
  }

  /**
   * Evalúa una señal early (tokens nuevos → Satellite preferente).
   *
   * La wallet confluence actúa como MULTIPLICADOR para early signals:
   * si smart wallets compran un token recién nacido, es la señal más
   * fuerte posible para la capa Satellite.
   */
  async evaluateEarly(
    early: EarlySignal,
    tokenHealth: TokenHealthResult | null,
    regime: RegimeSnapshot | null
  ): Promise<ConfluenceResult | null> {
    const reasons: string[] = [];
    let confidence = 0;

    // --- Capa 1: Early score (max 35 pts) ---
    if (early.earlyScore >= 75) {
      confidence += 35;
      reasons.push(`Early fuerte (${early.earlyScore}, ${early.tier})`);
    } else if (early.earlyScore >= 60) {
      confidence += 25;
      reasons.push(`Early moderado (${early.earlyScore}, ${early.tier})`);
    } else if (early.earlyScore >= this.config.minEarlyScore) {
      confidence += 15;
      reasons.push(`Early especulativo (${early.earlyScore})`);
    } else {
      return null;
    }

    reasons.push(`Pool ${early.pairAgeHours.toFixed(1)}h, $${(early.liquidityUsd / 1000).toFixed(0)}K liq`);

    // --- Capa 2: Wallet confluence (max 30 pts — BOOST para early) ---
    const walletConf = await this.checkWalletConfluence(
      early.tokenAddress,
      early.network
    );
    if (walletConf) {
      const baseWalletPts = walletConf.walletCount >= 5 ? 25 : 18;
      const boosted = Math.round(baseWalletPts * this.config.earlyWalletBoostMultiplier);
      const walletPts = Math.min(boosted, 30);
      confidence += walletPts;
      reasons.push(
        `${walletConf.walletCount} smart wallets en token early (boost x${this.config.earlyWalletBoostMultiplier})`
      );
    }

    // --- Capa 3: Token health (max 15 pts, umbral más bajo para early) ---
    if (tokenHealth) {
      if (tokenHealth.healthScore >= 70) {
        confidence += 15;
        reasons.push(`Token sano para early (${tokenHealth.healthScore})`);
      } else if (tokenHealth.healthScore >= this.config.minTokenHealthEarly) {
        confidence += 8;
        reasons.push(`Token aceptable (${tokenHealth.healthScore})`);
      } else {
        confidence -= 15;
        reasons.push(`Token insalubre (${tokenHealth.healthScore}) — descartado`);
        return null;
      }

      const criticalFlags = tokenHealth.contractRiskFlags.filter(
        (f) => f === "no_sells_24h" || f === "zero_price"
      );
      if (criticalFlags.length > 0) {
        reasons.push(`Critical flags: ${criticalFlags.join(", ")} — honeypot probable`);
        return null;
      }

      if (tokenHealth.contractRiskFlags.length > 0) {
        confidence -= tokenHealth.contractRiskFlags.length * 3;
        reasons.push(`Risk flags: ${tokenHealth.contractRiskFlags.join(", ")}`);
      }
    }

    // --- Capa 4: Organic buy patterns (max 10 pts) ---
    if (early.buyerSellerRatio >= 2) {
      confidence += 10;
      reasons.push(`Buyers/sellers ratio ${early.buyerSellerRatio.toFixed(1)} (muy orgánico)`);
    } else if (early.buyerSellerRatio >= 1.5) {
      confidence += 6;
      reasons.push(`Buyers/sellers ratio ${early.buyerSellerRatio.toFixed(1)}`);
    }

    // --- Capa 5: Market regime (max 10 pts / penalización suave) ---
    if (regime) {
      if (regime.regime === "risk_on") {
        confidence += 10;
        reasons.push("Mercado risk-on");
      } else if (regime.regime === "neutral") {
        confidence += 3;
      } else {
        confidence -= 4;
        reasons.push("Mercado risk-off — penalización suave para early");
      }
    }

    confidence = Math.max(0, Math.min(100, confidence));

    if (confidence < this.config.satelliteMinConfidence) return null;

    // Early signals van a Satellite salvo confluencia extrema con wallets
    const layer: Layer =
      confidence >= 85 && walletConf ? "core" : "satellite";

    return this.buildResult(
      "early",
      early.tokenSymbol,
      early.tokenAddress,
      early.network,
      layer,
      confidence,
      reasons,
      tokenHealth,
      walletConf,
      regime,
      null,
      early,
      { earlyScore: early.earlyScore, earlyTier: early.tier, pairAgeHours: early.pairAgeHours }
    );
  }

  private applyRegime(
    confidence: number,
    regime: RegimeSnapshot | null,
    reasons: string[]
  ): number {
    if (!regime) return confidence;

    if (regime.regime === "risk_on") {
      reasons.push("Mercado risk-on");
      return confidence + 15;
    } else if (regime.regime === "neutral") {
      reasons.push("Mercado neutral");
      return confidence + 5;
    } else {
      reasons.push("Mercado risk-off — penalización");
      return confidence - 8;
    }
  }

  private buildResult(
    signalSource: SignalSource,
    symbol: string,
    tokenAddress: string,
    network: string,
    layer: Layer,
    confidence: number,
    reasons: string[],
    tokenHealth: TokenHealthResult | null,
    walletConf: WalletConfluenceInfo | null,
    regime: RegimeSnapshot | null,
    momentum: MomentumSignal | null,
    early: EarlySignal | null,
    extraMeta: Record<string, unknown>
  ): ConfluenceResult {
    const order: OrderRequest = {
      userId: this.userId,
      symbol,
      tokenAddress,
      network,
      side: "buy",
      amountUsd: 0,
      layer,
      executionMode: "paper",
      entryReason: reasons.join(" | "),
      tokenHealthScoreAtEntry: tokenHealth?.healthScore,
      walletScoreAtEntry: walletConf?.avgWalletScore,
      metadata: {
        ...extraMeta,
        signalSource,
        confidence,
        walletConfluence: walletConf
          ? { count: walletConf.walletCount, avgScore: walletConf.avgWalletScore }
          : null,
        regime: regime?.regime ?? "unknown",
      },
    };

    return {
      token: symbol,
      tokenAddress,
      network,
      layer,
      confidence,
      reasons,
      signalSource,
      order,
      sources: {
        momentum,
        early,
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
      .eq("tracked_wallets.user_id", this.userId)
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
