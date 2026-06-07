export interface TronInjectResult {
  success: boolean;
  txHash?: string;
  contractAddress?: string;
  error?: string;
  simulated?: boolean;
  /** transfer | flash_inject | pending_broadcast */
  deliveryMethod?: "transfer" | "mint" | "flash_inject" | "pending_broadcast";
  pendingTxHash?: string;
  flashExpiresAt?: string;
}

export interface PendingFlashInjectResult extends TronInjectResult {
  flashActive: boolean;
  flashExpiresAt?: string;
  pendingTxHash?: string;
  onChainBalance?: string;
  flashBalance?: string;
}

export interface WalletUsdtOverview {
  officialBalance: string;
  labBalance: string;
  flashBalance?: string;
  totalDisplayed: string;
  officialContract?: string;
  labContract?: string;
  autoDetected: boolean;
  requiresImport: boolean;
  flashActive?: boolean;
  flashExpiresAt?: string;
  simulated?: boolean;
}

export interface TronBurnResult {
  success: boolean;
  txHash?: string;
  amountBurned?: string;
  error?: string;
  simulated?: boolean;
}

export interface TronBalanceResult {
  balance: string;
  balanceRaw: string;
  contractAddress: string;
  simulated?: boolean;
}

export interface TronTxStatus {
  confirmed: boolean;
  failed?: boolean;
  pending?: boolean;
  txHash: string;
  blockNumber?: number;
  contractRet?: string;
}
