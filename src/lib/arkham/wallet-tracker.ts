import { ArkhamClient } from "./client";
import type { ArkhamSwap } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface TrackedWallet {
  id: string;
  address: string;
  network: string;
  label: string | null;
  category: string;
}

export interface DetectedMovement {
  walletId: string;
  walletAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  network: string;
  direction: "buy" | "sell";
  amountToken: number;
  amountUsd: number;
  txHash: string;
  blockNumber: number;
  detectedAt: Date;
  raw: ArkhamSwap;
}

/**
 * WalletTracker — escanea wallets tracked buscando swaps (DEX trades)
 * recientes y los persiste como wallet_movements en Supabase.
 *
 * Usa GET /swaps de Arkham (más relevante para DeFi que /transfers).
 */
export class WalletTracker {
  constructor(
    private arkham: ArkhamClient,
    private supabase: SupabaseClient
  ) {}

  /**
   * Escanea todas las wallets activas de un usuario.
   * Devuelve los movimientos NUEVOS detectados (no duplicados).
   */
  async scanUser(userId: string): Promise<DetectedMovement[]> {
    const wallets = await this.getActiveWallets(userId);
    const allMovements: DetectedMovement[] = [];

    for (const wallet of wallets) {
      const movements = await this.scanWallet(wallet);
      allMovements.push(...movements);
    }

    return allMovements;
  }

  /**
   * Escanea una wallet individual: obtiene swaps recientes de Arkham,
   * filtra los ya conocidos y persiste los nuevos.
   */
  async scanWallet(wallet: TrackedWallet): Promise<DetectedMovement[]> {
    const swaps = await this.arkham.getSwaps({
      base: wallet.address,
      chains: wallet.network,
      flow: "all",
      timeLast: "24h",
      sortKey: "time",
      sortDir: "desc",
      limit: 50,
    });

    if (!swaps.swaps?.length) return [];

    const knownHashes = await this.getKnownTxHashes(
      wallet.id,
      swaps.swaps.map((s) => s.transactionHash)
    );

    const newSwaps = swaps.swaps.filter(
      (s) => !knownHashes.has(s.transactionHash)
    );

    const movements: DetectedMovement[] = newSwaps.map((swap) =>
      this.swapToMovement(wallet, swap)
    );

    if (movements.length > 0) {
      await this.persistMovements(movements);
    }

    return movements;
  }

  private swapToMovement(
    wallet: TrackedWallet,
    swap: ArkhamSwap
  ): DetectedMovement {
    const walletIsFrom = swap.addresses?.some(
      (a) => a.address?.toLowerCase() === wallet.address.toLowerCase()
    );

    const isBuy = walletIsFrom;
    const relevantToken = isBuy ? swap.token1 : swap.token0;

    return {
      walletId: wallet.id,
      walletAddress: wallet.address,
      tokenAddress: relevantToken.address,
      tokenSymbol: relevantToken.symbol,
      network: swap.chain,
      direction: isBuy ? "buy" : "sell",
      amountToken: parseFloat(relevantToken.unitValue) || 0,
      amountUsd: relevantToken.historicalUSD || swap.historicalUSD || 0,
      txHash: swap.transactionHash,
      blockNumber: swap.blockNumber,
      detectedAt: new Date(swap.blockTimestamp),
      raw: swap,
    };
  }

  private async persistMovements(movements: DetectedMovement[]): Promise<void> {
    const rows = movements.map((m) => ({
      wallet_id: m.walletId,
      token_address: m.tokenAddress,
      token_symbol: m.tokenSymbol,
      network: m.network,
      direction: m.direction,
      amount_token: m.amountToken,
      amount_usd: m.amountUsd,
      tx_hash: m.txHash,
      block_number: m.blockNumber,
      detected_at: m.detectedAt.toISOString(),
      metadata: { raw_swap_id: m.raw.id },
    }));

    const { error } = await this.supabase
      .from("wallet_movements")
      .insert(rows);

    if (error) {
      console.error("[WalletTracker] Error persistiendo movimientos:", error.message);
    }
  }

  private async getActiveWallets(userId: string): Promise<TrackedWallet[]> {
    const { data, error } = await this.supabase
      .from("tracked_wallets")
      .select("id, address, network, label, category")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      console.error("[WalletTracker] Error obteniendo wallets:", error.message);
      return [];
    }

    return (data ?? []) as TrackedWallet[];
  }

  private async getKnownTxHashes(
    walletId: string,
    txHashes: string[]
  ): Promise<Set<string>> {
    if (txHashes.length === 0) return new Set();

    const { data } = await this.supabase
      .from("wallet_movements")
      .select("tx_hash")
      .eq("wallet_id", walletId)
      .in("tx_hash", txHashes);

    return new Set((data ?? []).map((r) => r.tx_hash));
  }
}
