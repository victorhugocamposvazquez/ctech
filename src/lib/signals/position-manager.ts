import type { SupabaseClient } from "@supabase/supabase-js";
import { DexScreenerClient } from "../market/dexscreener";
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
}

export interface ExitSignal {
  tradeId: string;
  reason: string;
  exitPrice: number;
  pnlPct: number;
  pnlAbs: number;
}

export interface PositionManagerConfig {
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
}

const DEFAULT_CONFIG: PositionManagerConfig = {
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
};

/**
 * PositionManager — gestiona trades abiertos y genera señales de salida.
 *
 * Señales de salida:
 *  1. Trailing stop dinámico (ajustado por layer)
 *  2. Tiempo máximo de holding
 *  3. Volumen cayendo (momentum se agota)
 *  4. Liquidez bajando (peligro de no poder salir)
 *  5. Take profit escalonado
 */
export class PositionManager {
  private dex: DexScreenerClient;
  private config: PositionManagerConfig;

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
    const exits: ExitSignal[] = [];

    for (const pos of positions) {
      const exit = await this.evaluatePosition(pos);
      if (exit) {
        await this.closeTrade(exit);
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
        return this.createExit(pos, pos.entryPrice * 0.95, "Par no encontrado en DexScreener — salida preventiva");
      }
      currentPrice = parseFloat(pair.priceUsd) || 0;
      currentLiquidity = pair.liquidity?.usd ?? 0;
      currentVolume = pair.volume?.h24 ?? 0;
    } catch {
      return null;
    }

    if (currentPrice <= 0) return null;

    const pnlPct = (currentPrice - pos.entryPrice) / pos.entryPrice;
    const highestPrice = Math.max(pos.highestPrice, currentPrice);

    await this.updatePositionPrice(pos.tradeId, currentPrice, highestPrice);

    // 1. Trailing stop
    const trailingPct = pos.layer === "core"
      ? this.config.coreTrailingStopPct
      : this.config.satelliteTrailingStopPct;

    const trailingStopPrice = highestPrice * (1 - trailingPct);

    if (currentPrice <= trailingStopPrice && pnlPct < 0) {
      return this.createExit(pos, currentPrice,
        `Trailing stop (${(trailingPct * 100).toFixed(0)}% desde máximo $${highestPrice.toFixed(6)})`
      );
    }

    // 2. Tiempo máximo
    const maxHoldMs = pos.layer === "core"
      ? this.config.coreMaxHoldHours * 3600_000
      : this.config.satelliteMaxHoldHours * 3600_000;

    const holdTimeMs = Date.now() - pos.openedAt.getTime();
    if (holdTimeMs >= maxHoldMs) {
      return this.createExit(pos, currentPrice,
        `Tiempo máximo alcanzado (${(holdTimeMs / 3600_000).toFixed(0)}h)`
      );
    }

    // 3. Volumen cayendo (comparar con metadata de entrada si hay)
    if (currentVolume > 0) {
      const entryVolume = (pos as unknown as { metadata?: { entryVolume24h?: number } }).metadata?.entryVolume24h;
      if (entryVolume && entryVolume > 0) {
        const volumeRatio = currentVolume / entryVolume;
        if (volumeRatio < this.config.volumeDropExitThreshold && pnlPct > 0) {
          return this.createExit(pos, currentPrice,
            `Volumen cayó al ${(volumeRatio * 100).toFixed(0)}% del volumen de entrada — momentum agotado`
          );
        }
      }
    }

    // 4. Liquidez bajando
    if (currentLiquidity > 0 && currentLiquidity < 30_000) {
      return this.createExit(pos, currentPrice,
        `Liquidez peligrosamente baja ($${currentLiquidity.toFixed(0)}) — salida preventiva`
      );
    }

    // 5. Take profit escalonado (cierra si supera TP2)
    const tp2 = pos.layer === "core"
      ? this.config.coreTakeProfit2Pct
      : this.config.satelliteTakeProfit2Pct;

    if (pnlPct >= tp2) {
      return this.createExit(pos, currentPrice,
        `Take profit alcanzado (+${(pnlPct * 100).toFixed(1)}%)`
      );
    }

    return null;
  }

  private createExit(
    pos: OpenPosition,
    exitPrice: number,
    reason: string
  ): ExitSignal {
    const pnlPct = (exitPrice - pos.entryPrice) / pos.entryPrice;
    const pnlAbs = (exitPrice - pos.entryPrice) * pos.quantity;

    return {
      tradeId: pos.tradeId,
      reason,
      exitPrice,
      pnlPct,
      pnlAbs,
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
    }));
  }

  private async updatePositionPrice(
    tradeId: string,
    currentPrice: number,
    highestPrice: number
  ): Promise<void> {
    await this.supabase
      .from("trades")
      .update({
        metadata: {
          currentPrice,
          highestPrice,
          lastCheckedAt: new Date().toISOString(),
        },
      })
      .eq("id", tradeId);
  }

  private async closeTrade(exit: ExitSignal): Promise<void> {
    await this.supabase
      .from("trades")
      .update({
        status: "closed",
        exit_price: exit.exitPrice,
        pnl_abs: exit.pnlAbs,
        pnl_pct: exit.pnlPct,
        is_win: exit.pnlPct > 0,
        exit_reason: exit.reason,
        closed_at: new Date().toISOString(),
      })
      .eq("id", exit.tradeId);
  }
}
