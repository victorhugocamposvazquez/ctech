import { type Address, erc20Abi, isAddress } from "viem";
import { walletChain } from "./config";
import {
  DEFAULT_MANAGED_TOKENS,
  managedTokenToWalletToken,
  OFFICIAL_TOKEN_LOGOS,
  type WalletTokenConfig,
} from "./managed-tokens";

export interface WalletToken {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  address?: Address;
  isNative?: boolean;
  logo: string;
  /** Precio fijo USD (p. ej. stablecoins) */
  fixedUsdPrice?: number;
  /** Buscar precio en DexScreener */
  dexScreener?: boolean;
}

export type { WalletTokenConfig };

/** USDT en BNB Smart Chain (BEP-20) */
export const USDT_BSC =
  "0x55d398326f99059fF775485246999027B3197955" as Address;

function customToken(): WalletToken | null {
  const raw = process.env.NEXT_PUBLIC_CUSTOM_TOKEN_ADDRESS?.trim();
  if (!raw || !isAddress(raw)) return null;

  return {
    id: "custom",
    symbol: process.env.NEXT_PUBLIC_CUSTOM_TOKEN_SYMBOL ?? "TOKEN",
    name: process.env.NEXT_PUBLIC_CUSTOM_TOKEN_NAME ?? "Custom Token",
    decimals: Number(process.env.NEXT_PUBLIC_CUSTOM_TOKEN_DECIMALS ?? "18"),
    address: raw,
    logo: "/wallet/icons/token-custom.svg",
    dexScreener: true,
  };
}

function getNativeToken(): WalletToken {
  return {
    id: "bnb",
    symbol: "BNB",
    name: "BNB",
    decimals: 18,
    isNative: true,
    logo: OFFICIAL_TOKEN_LOGOS.BNB,
    dexScreener: false,
  };
}

function getDefaultManagedTokens(): WalletToken[] {
  return DEFAULT_MANAGED_TOKENS.filter((t) => t.is_active)
    .map((token) =>
      managedTokenToWalletToken({
        ...token,
        id: `default-${token.symbol.toLowerCase()}`,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    )
    .filter((t): t is WalletTokenConfig => t != null);
}

export function getWalletTokens(managed?: WalletTokenConfig[]): WalletToken[] {
  const tokens: WalletToken[] = [getNativeToken()];

  const managedTokens = managed?.length ? managed : getDefaultManagedTokens();
  tokens.push(...managedTokens);

  const custom = customToken();
  if (custom) tokens.push(custom);

  return tokens;
}

export const erc20BalanceAbi = erc20Abi;

export const walletChainSlug = walletChain.id === 97 ? "bsc" : "bsc";
