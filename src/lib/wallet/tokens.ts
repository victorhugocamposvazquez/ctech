import { type Address, erc20Abi, isAddress } from "viem";
import { walletChain } from "./config";

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

export function getWalletTokens(): WalletToken[] {
  const tokens: WalletToken[] = [
    {
      id: "bnb",
      symbol: "BNB",
      name: "BNB",
      decimals: 18,
      isNative: true,
      logo: "/wallet/icons/bnb.svg",
      dexScreener: false,
    },
    {
      id: "usdt",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 18,
      address: USDT_BSC,
      logo: "/wallet/icons/usdt.svg",
      fixedUsdPrice: 1,
    },
  ];

  const custom = customToken();
  if (custom) tokens.push(custom);

  return tokens;
}

export const erc20BalanceAbi = erc20Abi;

export const walletChainSlug = walletChain.id === 97 ? "bsc" : "bsc";
