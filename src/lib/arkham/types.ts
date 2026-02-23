// ============================================================
// Tipos de respuesta de Arkham Intelligence API v1.1.0
// Base URL: https://api.arkm.com
// Auth: header API-Key
// ============================================================

// --------------- Transfers ---------------

export interface ArkhamTransfer {
  id: string;
  chain: string;
  blockNumber: number;
  blockTimestamp: number; // ms epoch
  transactionHash: string;
  tokenAddress: string | null;
  tokenSymbol: string;
  tokenName: string;
  fromAddress: ArkhamAddressInfo;
  toAddress: ArkhamAddressInfo;
  unitValue: string;
  historicalUSD: number;
}

export interface ArkhamTransfersResponse {
  transfers: ArkhamTransfer[];
  count: number;
}

// --------------- Swaps (DEX trades) ---------------

export interface ArkhamSwap {
  id: string;
  chain: string;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
  addresses: ArkhamAddressInfo[];
  token0: ArkhamSwapToken;
  token1: ArkhamSwapToken;
  historicalUSD: number;
  protocol?: ArkhamAddressInfo;
}

export interface ArkhamSwapToken {
  address: string;
  symbol: string;
  name: string;
  unitValue: string;
  historicalUSD: number;
}

export interface ArkhamSwapsResponse {
  swaps: ArkhamSwap[];
  count: number;
}

// --------------- Address Intelligence ---------------

export interface ArkhamAddressInfo {
  address: string;
  chain?: string;
  arkhamEntity?: ArkhamEntity | null;
  arkhamLabel?: ArkhamLabel | null;
  isContract?: boolean;
}

export interface ArkhamEntity {
  id: string;
  name: string;
  type?: string;
  website?: string;
  twitter?: string;
}

export interface ArkhamLabel {
  name: string;
  address?: string;
  chain?: string;
}

// --------------- Token Market Data ---------------

export interface ArkhamTokenMarket {
  id: string;
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number;
  priceChange24h?: number;
  priceChange7d?: number;
}

// --------------- Token Holders ---------------

export interface ArkhamTokenHolder {
  address: ArkhamAddressInfo;
  balance: string;
  share: number;
}

export interface ArkhamTokenHoldersResponse {
  holders: ArkhamTokenHolder[];
}

// --------------- Query params ---------------

export interface TransfersQuery {
  base: string;
  chains?: string;
  flow?: "in" | "out" | "self" | "all";
  tokens?: string;
  timeLast?: string;
  timeGte?: string;
  timeLte?: string;
  usdGte?: string;
  usdLte?: string;
  sortKey?: "time" | "value" | "usd";
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface SwapsQuery {
  base: string;
  chains?: string;
  flow?: "in" | "out" | "all";
  tokens?: string;
  timeLast?: string;
  timeGte?: string;
  timeLte?: string;
  usdGte?: string;
  usdLte?: string;
  sortKey?: "time" | "usd";
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
}
