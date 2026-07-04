import { type Address, isAddress } from "viem";

export interface ManagedTokenRecord {
  id: string;
  symbol: string;
  name: string;
  contract_address: string;
  network: string;
  decimals: number;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WalletTokenConfig {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  address: Address;
  logo: string;
  fixedUsdPrice?: number;
  dexScreener?: boolean;
}

/** Direcciones reales en BNB Smart Chain (BEP-20) */
export const BSC_TOKEN_ADDRESSES = {
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  BTC: "0x7130d2A12B9BCbAEdf2C6c659494615EF9790",
  ETH: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
} as const;

export const DEFAULT_MANAGED_TOKENS: Omit<
  ManagedTokenRecord,
  "id" | "created_at" | "updated_at" | "metadata"
>[] = [
  {
    symbol: "USDT",
    name: "Tether USD",
    contract_address: BSC_TOKEN_ADDRESSES.USDT,
    network: "bsc",
    decimals: 18,
    logo_url: "/wallet/icons/usdt.svg",
    is_active: true,
    sort_order: 1,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    contract_address: BSC_TOKEN_ADDRESSES.USDC,
    network: "bsc",
    decimals: 18,
    logo_url: "/wallet/icons/usdc.svg",
    is_active: true,
    sort_order: 2,
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    contract_address: BSC_TOKEN_ADDRESSES.BTC,
    network: "bsc",
    decimals: 18,
    logo_url: "/wallet/icons/btc.svg",
    is_active: true,
    sort_order: 3,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    contract_address: BSC_TOKEN_ADDRESSES.ETH,
    network: "bsc",
    decimals: 18,
    logo_url: "/wallet/icons/eth.svg",
    is_active: true,
    sort_order: 4,
  },
];

export function managedTokenToWalletToken(
  token: ManagedTokenRecord
): WalletTokenConfig | null {
  const address = token.contract_address.trim();
  if (!isAddress(address)) return null;

  const stable = token.symbol === "USDT" || token.symbol === "USDC";

  return {
    id: token.id,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    address: address as Address,
    logo: token.logo_url ?? "/wallet/icons/token-custom.svg",
    fixedUsdPrice: stable ? 1 : undefined,
    dexScreener: !stable,
  };
}

export function normalizeWalletAddress(address: string): string {
  return address.trim().toLowerCase();
}
