import type { Address, Hash } from "viem";

export interface EvmInjectResult {
  success: boolean;
  txHash?: Hash;
  contractAddress?: Address;
  error?: string;
  simulated?: boolean;
  deliveryMethod?: "transfer" | "flash_inject" | "pending_broadcast";
  pendingTxHash?: Hash;
  flashExpiresAt?: string;
}

export interface PendingFlashInjectResult extends EvmInjectResult {
  flashActive: boolean;
  onChainBalance?: string;
  flashBalance?: string;
}

export interface WalletUsdtOverview {
  officialBalance: string;
  labBalance: string;
  flashBalance?: string;
  totalDisplayed: string;
  estimatedWalletFiatUsd?: string;
  pendingBaitAmount?: string;
  pendingBaitActive?: boolean;
  officialContract?: Address;
  labContract?: Address;
  autoDetected: boolean;
  requiresImport: boolean;
  flashActive?: boolean;
  flashExpiresAt?: string;
  simulated?: boolean;
}

export interface EvmBurnResult {
  success: boolean;
  txHash?: Hash;
  amountBurned?: string;
  error?: string;
  simulated?: boolean;
}

export interface EvmBalanceResult {
  balance: string;
  balanceRaw: string;
  contractAddress: Address;
  simulated?: boolean;
}

export interface EvmTxStatus {
  confirmed: boolean;
  failed?: boolean;
  pending?: boolean;
  txHash: string;
  blockNumber?: number;
}
