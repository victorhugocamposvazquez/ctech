import type { SupabaseClient } from "@supabase/supabase-js";
import { DexScreenerClient } from "../market/dexscreener";
import { SlippageModel } from "../engine/slippage-model";
import { estimateGasUsd } from "../engine/paper-broker";
import type { Layer } from "../engine/types";

export interface OpenPosition {
  tradeId: string;
  userId: string;
  symbol: string;
  tokenAddress: string;
  network: string;
  side: "buy" | "sell";
  layer: Layer;
  entryPrice: number;
  quantity: number;
  openedAt: Date;
  highestPrice: number;
  currentPrice: number;
  pnlPct: number;
  trailingStopPrice: number;
  metadata: Record<string, unknown>;
}

export interface ExitSignal {
  tradeId: string;
  reason: string;
  /** Precio efectivo de salida tras slippage + fee (lo que cobrarías de verdad). */
  exitPrice: number;
  pnlPct: number;
  pnlAbs: number;
  /** Precio spot observado antes de aplicar fricción. */
  rawExitPrice: number;
  exitSlippagePct: number;
  exitGasUsd: number;
  /**
   * "full": la posición se cerró entera (closeTrade pendiente en caller).
   * "partial": venta parcial ya persistida (fila nueva cerrada + fila
   * original reducida). El caller NO debe llamar a closeTrade.
   */
  kind: "full" | "partial";
}

export interface PositionManagerConfig {
  coreStopLossPct: number;
  satelliteStopLossPct: number;
  coreTrailingStopPct: number;
  satelliteTrailingStopPct: number;
  coreMaxHoldHours: number;
  satelliteMaxHoldHours: number;
  coreTakeProfit1Pct: number;
  coreTakeProfit2Pct: number;
  satelliteTakeProfit1Pct: number;
  satelliteTakeProfit2Pct: number;
  volumeDropExitThreshold: number;
  liquidityDropExitPct: number;
  /** Fracción vendida al alcanzar TP1 (el resto sigue corriendo). */
  takeProfit1SellFraction: number;
  /** Margen sobre el coste pendiente al convertir a moonbag (cubre gas/ruido). */
  moonbagCostRecoveryMargin: number;
  /** Salida terminal del moonbag: caída desde su máximo histórico. */
  moonbagMaxDrawdownFromPeakPct: number;
  /** Máximo de moonbags abiertos simultáneamente por usuario. */
  maxOpenMoonbags: number;
  /** Liquidez mínima bajo la cual cualquier posición (moonbag incluido) sale. */
  minExitLiquidityUsd: number;
}

const DEFAULT_CONFIG: PositionManagerConfig = {
  coreStopLossPct: 0.07,
  satelliteStopLossPct: 0.15,
  coreTrailingStopPct: 0.05,
  satelliteTrailingStopPct: 0.10,
  coreMaxHoldHours: 48,
  satelliteMaxHoldHours: 168, // 7 días
  coreTakeProfit1Pct: 0.08,
  coreTakeProfit2Pct: 0.15,
  satelliteTakeProfit1Pct: 0.30,
  satelliteTakeProfit2Pct: 0.80,
  volumeDropExitThreshold: 0.3,
  liquidityDropExitPct: 0.30,
  takeProfit1SellFraction: 0.5,
  moonbagCostRecoveryMargin: 0.02,
  moonbagMaxDrawdownFromPeakPct: 0.80,
  maxOpenMoonbags: 5,
  minExitLiquidityUsd: 30_000,
};

/**
 * PositionManager — gestiona trades abiertos y genera señales de salida.
 *
 * Posiciones normales (en orden de evaluación):
 *  1. Stop-loss duro desde entrada (trunca la cola izquierda)
 *  2. Trailing stop dinámico (protege beneficios ya generados)
 *  3. Tiempo máximo de holding
 *  4. Volumen cayendo (momentum se agota)
 *  5. Liquidez bajando (peligro de no poder salir)
 *  6. TP2:
 *     - Core: cierre total (sleeve de consistencia, sin loterías)
 *     - Satellite: venta parcial que recupera TODO el coste y conversión
 *       del resto en MOONBAG (si hay hueco; si no, cierre total)
 *  7. TP1: venta parcial del 50%, el resto sigue corriendo
 *
 * Moonbags (posiciones satellite post-TP2 con coste ya recuperado):
 *  - Sin stop-loss, sin trailing, sin TP, sin tiempo máximo. Es la ventana
 *    a explosiones (10x-1000x): un trailing del 10% saldría en el primer
 *    retroceso del viaje. El downside en capital es CERO porque el coste
 *    se recuperó al convertir; lo único en juego es beneficio no realizado.
 *  - Salidas terminales únicamente: liquidez colapsada (<$30K), caída del
 *    80% desde su máximo (token muerto) o par desaparecido.
 *  - Cap de moonbags simultáneos para que la lotería no domine el book.
 *
 * Fricción simétrica: toda salida (total o parcial) aplica slippage AMM +
 * fee 0.3% + gas, igual que la entrada en PaperBroker.
 */
export class PositionManager {
  private dex: DexScreenerClient;
  private config: PositionManagerConfig;
  private openMoonbagCount = 0;

  constructor(
    private supabase: SupabaseClient,
    config?: Partial<PositionManagerConfig>
  ) {
    this.dex = new DexScreenerClient();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Revisa todas las posiciones abiertas de un usuario
   * y genera señales de salida donde corresponda.
   */
  async checkPositions(userId: string): Promise<ExitSignal[]> {
    const positions = await this.getOpenPositions(userId);
    this.openMoonbagCount = positions.filter(
      (p) => p.metadata.moonbag === true
    ).length;

    const exits: ExitSignal[] = [];

    for (const pos of positions) {
      const exit = await this.evaluatePosition(pos);
      if (exit) {
        if (exit.kind === "full") {
          await this.closeTrade(exit, pos);
        }
        exits.push(exit);
      }
    }

    return exits;
  }

  private async evaluatePosition(pos: OpenPosition): Promise<ExitSignal | null> {
    let currentPrice: number;
    let currentLiquidity: number;
    let currentVolume: number;

    try {
      const pair = await this.dex.getBestPair(pos.network, pos.tokenAddress);
      if (!pair) {
        // Par desaparecido = casi siempre rug (liquidez retirada). Registrar
        // esto como -5% inflaría el paper justo en los peores resultados.
        // 3 chequeos consecutivos para descartar fallos transitorios de la
        // API; después, pérdida casi total (valor residual 2% del último
        // precio conocido).
        const misses = Number(pos.metadata.pairMissingChecks ?? 0) + 1;
        if (misses < 3) {
          pos.metadata = { ...pos.metadata, pairMissingChecks: misses };
          await this.supabase
            .from("trades")
            .update({ metadata: pos.metadata })
            .eq("id", pos.tradeId);
          return null;
        }
        const lastKnown = pos.currentPrice > 0 ? pos.currentPrice : pos.entryPrice;
        return this.createExit(pos, lastKnown * 0.02, 0,
          "Par desaparecido de DexScreener (3 chequeos) — rug asumido, valor residual 2%");
      }
      currentPrice = parseFloat(pair.priceUsd) || 0;
      currentLiquidity = pair.liquidity?.usd ?? 0;
      currentVolume = pair.volume?.h24 ?? 0;
      if (pos.metadata.pairMissingChecks) {
        pos.metadata = { ...pos.metadata, pairMissingChecks: 0 };
      }
    } catch {
      return null;
    }

    if (currentPrice <= 0) return null;

    const pnlPct = (currentPrice - pos.entryPrice) / pos.entryPrice;
    const highestPrice = Math.max(pos.highestPrice, currentPrice);

    const trailingPct = pos.layer === "core"
      ? this.config.coreTrailingStopPct
      : this.config.satelliteTrailingStopPct;

    const trailingStopPrice = highestPrice * (1 - trailingPct);
    await this.updatePositionPrice(pos, currentPrice, highestPrice, trailingStopPrice);

    // --- Rama moonbag: solo salidas terminales ---
    if (pos.metadata.moonbag === true) {
      return this.evaluateMoonbag(pos, currentPrice, currentLiquidity, highestPrice);
    }

    // 1. Stop-loss duro desde entrada — independiente del trailing.
    //    Corta la cola izquierda: sin esto, una posición que nunca entra
    //    en beneficio puede caer hasta -100% (rug) sin cierre.
    const stopLossPct = pos.layer === "core"
      ? this.config.coreStopLossPct
      : this.config.satelliteStopLossPct;

    if (pnlPct <= -stopLossPct) {
      return this.createExit(pos, currentPrice, currentLiquidity,
        `Stop-loss (${(pnlPct * 100).toFixed(1)}% <= -${(stopLossPct * 100).toFixed(0)}% desde entrada)`
      );
    }

    // 2. Trailing stop (solo protege beneficios ya generados)
    const isAfterProfitRun = highestPrice > pos.entryPrice;
    if (currentPrice <= trailingStopPrice && isAfterProfitRun) {
      return this.createExit(pos, currentPrice, currentLiquidity,
        `Trailing stop (${(trailingPct * 100).toFixed(0)}% desde máximo $${highestPrice.toFixed(6)})`
      );
    }

    // 3. Tiempo máximo
    const maxHoldMs = pos.layer === "core"
      ? this.config.coreMaxHoldHours * 3600_000
      : this.config.satelliteMaxHoldHours * 3600_000;

    const holdTimeMs = Date.now() - pos.openedAt.getTime();
    if (holdTimeMs >= maxHoldMs) {
      return this.createExit(pos, currentPrice, currentLiquidity,
        `Tiempo máximo alcanzado (${(holdTimeMs / 3600_000).toFixed(0)}h)`
      );
    }

    // 4. Volumen cayendo (comparar con metadata de entrada si hay)
    if (currentVolume > 0) {
      const entryVolume = Number(pos.metadata.entryVolume24h ?? 0);
      if (entryVolume && entryVolume > 0) {
        const volumeRatio = currentVolume / entryVolume;
        if (volumeRatio < this.config.volumeDropExitThreshold && pnlPct > 0) {
          return this.createExit(pos, currentPrice, currentLiquidity,
            `Volumen cayó al ${(volumeRatio * 100).toFixed(0)}% del volumen de entrada — momentum agotado`
          );
        }
      }
    }

    // 5. Liquidez bajando
    if (currentLiquidity > 0 && currentLiquidity < this.config.minExitLiquidityUsd) {
      return this.createExit(pos, currentPrice, currentLiquidity,
        `Liquidez peligrosamente baja ($${currentLiquidity.toFixed(0)}) — salida preventiva`
      );
    }

    // 6. TP2 — Core cierra todo; Satellite recupera coste y deja moonbag
    const tp2 = pos.layer === "core"
      ? this.config.coreTakeProfit2Pct
      : this.config.satelliteTakeProfit2Pct;

    if (pnlPct >= tp2) {
      if (pos.layer === "satellite" && this.openMoonbagCount < this.config.maxOpenMoonbags) {
        const converted = await this.convertToMoonbag(pos, currentPrice, currentLiquidity, pnlPct);
        if (converted) {
          this.openMoonbagCount++;
          return converted;
        }
      }
      return this.createExit(pos, currentPrice, currentLiquidity,
        `Take profit alcanzado (+${(pnlPct * 100).toFixed(1)}%)`
      );
    }

    // 7. TP1 — venta parcial, el resto sigue corriendo
    const tp1 = pos.layer === "core"
      ? this.config.coreTakeProfit1Pct
      : this.config.satelliteTakeProfit1Pct;

    if (pos.metadata.tp1Done !== true && pnlPct >= tp1) {
      return this.partialClose(
        pos,
        this.config.takeProfit1SellFraction,
        currentPrice,
        currentLiquidity,
        { tp1Done: true },
        `TP1 parcial (+${(pnlPct * 100).toFixed(1)}%): vendido ${(this.config.takeProfit1SellFraction * 100).toFixed(0)}%, el resto sigue con trailing`
      );
    }

    return null;
  }

  /**
   * Moonbag: posición satellite cuyo coste ya fue recuperado en TP2.
   * Sin stops ni límite de tiempo — es la ventana a 10x-1000x. Solo
   * salidas terminales (token muerto o ilíquido).
   */
  private evaluateMoonbag(
    pos: OpenPosition,
    currentPrice: number,
    currentLiquidity: number,
    highestPrice: number
  ): ExitSignal | null {
    if (currentLiquidity > 0 && currentLiquidity < this.config.minExitLiquidityUsd) {
      return this.createExit(pos, currentPrice, currentLiquidity,
        `Moonbag terminal: liquidez colapsada ($${currentLiquidity.toFixed(0)})`
      );
    }

    const drawdownFromPeak = highestPrice > 0
      ? (highestPrice - currentPrice) / highestPrice
      : 0;

    if (drawdownFromPeak >= this.config.moonbagMaxDrawdownFromPeakPct) {
      return this.createExit(pos, currentPrice, currentLiquidity,
        `Moonbag terminal: -${(drawdownFromPeak * 100).toFixed(0)}% desde máximo $${highestPrice.toFixed(6)} — token agotado`
      );
    }

    return null;
  }

  /**
   * Conversión a moonbag en TP2 satellite: vende la fracción justa para
   * recuperar el 100% del coste original (con margen para gas) y deja el
   * resto corriendo sin límites. La lotería queda financiada con beneficio
   * realizado, nunca con capital.
   *
   * Devuelve null si la fracción necesaria es tan alta que no merece la
   * pena (resto < 5%) — en ese caso el caller hace cierre total normal.
   */
  private async convertToMoonbag(
    pos: OpenPosition,
    rawPrice: number,
    liquidityUsd: number,
    pnlPct: number
  ): Promise<ExitSignal | null> {
    const costBasisUsd = Number(
      pos.metadata.costBasisUsd ?? pos.entryPrice * pos.quantity
    );
    const recoveredUsd = Number(pos.metadata.recoveredUsd ?? 0);
    const remainingCost = Math.max(0, costBasisUsd - recoveredUsd);

    // Precio efectivo estimado para calcular la fracción necesaria
    const grossValue = rawPrice * pos.quantity;
    const slippage = SlippageModel.estimate(
      grossValue, liquidityUsd, rawPrice, "sell", { feeRate: 0.003 }
    );
    const effectivePrice = rawPrice * (1 - slippage.slippagePct);
    const sellableValue = effectivePrice * pos.quantity;
    if (sellableValue <= 0) return null;

    const targetRecovery = remainingCost * (1 + this.config.moonbagCostRecoveryMargin);
    const fraction = targetRecovery > 0
      ? targetRecovery / sellableValue
      : this.config.takeProfit1SellFraction;

    // Si recuperar el coste exige vender casi todo, no hay moonbag que valga
    if (fraction >= 0.95) return null;

    return this.partialClose(
      pos,
      Math.max(fraction, 0.05),
      rawPrice,
      liquidityUsd,
      {
        moonbag: true,
        moonbagConvertedAt: new Date().toISOString(),
        moonbagEntryPnlPct: pnlPct,
      },
      `TP2 (+${(pnlPct * 100).toFixed(1)}%): coste recuperado, ${((1 - fraction) * 100).toFixed(0)}% convertido en moonbag sin límites`
    );
  }

  /**
   * Venta parcial: inserta una fila `trades` cerrada con la parte vendida
   * (con su PnL realizado) y reduce la cantidad de la fila original, que
   * sigue abierta. Aplica la misma fricción que cualquier salida.
   */
  private async partialClose(
    pos: OpenPosition,
    fraction: number,
    rawPrice: number,
    liquidityUsd: number,
    metadataPatch: Record<string, unknown>,
    reason: string
  ): Promise<ExitSignal | null> {
    const soldQuantity = pos.quantity * fraction;
    const remainingQuantity = pos.quantity - soldQuantity;
    if (soldQuantity <= 0 || remainingQuantity <= 0) return null;

    const soldValueUsd = rawPrice * soldQuantity;
    const slippage = SlippageModel.estimate(
      soldValueUsd, liquidityUsd, rawPrice, "sell", { feeRate: 0.003 }
    );
    const exitPrice = rawPrice * (1 - slippage.slippagePct);
    const exitGasUsd = estimateGasUsd(pos.network);

    const pnlPct = (exitPrice - pos.entryPrice) / pos.entryPrice;
    const pnlAbs = (exitPrice - pos.entryPrice) * soldQuantity - exitGasUsd;
    const proceedsUsd = exitPrice * soldQuantity - exitGasUsd;

    const costBasisUsd = Number(
      pos.metadata.costBasisUsd ?? pos.entryPrice * pos.quantity
    );
    const recoveredUsd = Number(pos.metadata.recoveredUsd ?? 0) + proceedsUsd;

    // 1. Fila nueva: la parte vendida, ya cerrada con su PnL
    const { data: closedRow, error: insertError } = await this.supabase
      .from("trades")
      .insert({
        user_id: pos.userId,
        symbol: pos.symbol,
        side: pos.side,
        status: "closed",
        quantity: soldQuantity,
        entry_price: pos.entryPrice,
        exit_price: exitPrice,
        opened_at: pos.openedAt.toISOString(),
        closed_at: new Date().toISOString(),
        pnl_abs: pnlAbs,
        pnl_pct: pnlPct,
        is_win: pnlAbs > 0,
        execution_mode: "paper",
        layer: pos.layer,
        exit_reason: reason,
        metadata: {
          ...pos.metadata,
          partialOf: pos.tradeId,
          partialFraction: fraction,
          rawExitPrice: rawPrice,
          exitSlippagePct: slippage.slippagePct,
          exitGasUsd,
        },
      })
      .select("id")
      .single();

    if (insertError || !closedRow) return null;

    // 2. Fila original: cantidad reducida + estado actualizado
    const updatedMetadata = {
      ...pos.metadata,
      ...metadataPatch,
      costBasisUsd,
      recoveredUsd,
      originalQuantity: Number(pos.metadata.originalQuantity ?? pos.quantity),
    };

    await this.supabase
      .from("trades")
      .update({
        quantity: remainingQuantity,
        metadata: updatedMetadata,
      })
      .eq("id", pos.tradeId);

    pos.quantity = remainingQuantity;
    pos.metadata = updatedMetadata;

    return {
      tradeId: closedRow.id as string,
      reason,
      exitPrice,
      pnlPct,
      pnlAbs,
      rawExitPrice: rawPrice,
      exitSlippagePct: slippage.slippagePct,
      exitGasUsd,
      kind: "partial",
    };
  }

  /**
   * Construye la señal de salida total aplicando la MISMA fricción que la
   * entrada: slippage AMM (constant-product) + fee 0.3% + gas de red.
   */
  private createExit(
    pos: OpenPosition,
    rawExitPrice: number,
    liquidityUsd: number,
    reason: string
  ): ExitSignal {
    const positionUsd = rawExitPrice * pos.quantity;
    const slippage = SlippageModel.estimate(
      positionUsd,
      liquidityUsd,
      rawExitPrice,
      "sell",
      { feeRate: 0.003 }
    );
    const exitPrice = rawExitPrice * (1 - slippage.slippagePct);
    const exitGasUsd = estimateGasUsd(pos.network);

    const pnlPct = (exitPrice - pos.entryPrice) / pos.entryPrice;
    const pnlAbs = (exitPrice - pos.entryPrice) * pos.quantity - exitGasUsd;

    return {
      tradeId: pos.tradeId,
      reason,
      exitPrice,
      pnlPct,
      pnlAbs,
      rawExitPrice,
      exitSlippagePct: slippage.slippagePct,
      exitGasUsd,
      kind: "full",
    };
  }

  private async getOpenPositions(userId: string): Promise<OpenPosition[]> {
    const { data, error } = await this.supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "open")
      .eq("execution_mode", "paper")
      .order("opened_at", { ascending: true });

    if (error || !data) return [];

    return data.map((t) => ({
      tradeId: t.id,
      userId: t.user_id,
      symbol: t.symbol,
      tokenAddress: t.metadata?.tokenAddress ?? "",
      network: t.metadata?.network ?? "ethereum",
      side: t.side as "buy" | "sell",
      layer: t.layer as Layer,
      entryPrice: Number(t.entry_price) || 0,
      quantity: Number(t.quantity) || 0,
      openedAt: new Date(t.opened_at),
      highestPrice: Number(t.metadata?.highestPrice ?? t.entry_price) || 0,
      currentPrice: Number(t.metadata?.currentPrice ?? t.entry_price) || 0,
      pnlPct: Number(t.pnl_pct) || 0,
      trailingStopPrice: Number(t.metadata?.trailingStopPrice ?? 0),
      metadata: (t.metadata as Record<string, unknown>) ?? {},
    }));
  }

  private async updatePositionPrice(
    pos: OpenPosition,
    currentPrice: number,
    highestPrice: number,
    trailingStopPrice: number
  ): Promise<void> {
    pos.metadata = {
      ...pos.metadata,
      currentPrice,
      highestPrice,
      trailingStopPrice,
      lastCheckedAt: new Date().toISOString(),
    };
    pos.highestPrice = highestPrice;

    await this.supabase
      .from("trades")
      .update({ metadata: pos.metadata })
      .eq("id", pos.tradeId);
  }

  private async closeTrade(exit: ExitSignal, pos: OpenPosition): Promise<void> {
    // .eq("status", "open"): con dos schedulers (ciclo 15 min + monitor
    // 1 min) un trade podría evaluarse dos veces casi a la vez; el filtro
    // hace el cierre idempotente — solo el primero gana.
    await this.supabase
      .from("trades")
      .update({
        status: "closed",
        exit_price: exit.exitPrice,
        pnl_abs: exit.pnlAbs,
        pnl_pct: exit.pnlPct,
        is_win: exit.pnlAbs > 0,
        exit_reason: exit.reason,
        closed_at: new Date().toISOString(),
        metadata: {
          ...pos.metadata,
          rawExitPrice: exit.rawExitPrice,
          exitSlippagePct: exit.exitSlippagePct,
          exitGasUsd: exit.exitGasUsd,
        },
      })
      .eq("id", exit.tradeId)
      .eq("status", "open");
  }
}
