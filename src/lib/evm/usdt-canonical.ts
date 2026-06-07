import type { Address } from "viem";
import { getDefaultEvmNetwork, type EvmNetwork } from "./network";

const USDT_BY_NETWORK: Record<
  EvmNetwork,
  { address: Address; decimals: number; explorer: string; explorerTokenPath: string }
> = {
  bsc: {
    address: "0x55d398326f99059fF775485246999027B3197955",
    decimals: 18,
    explorer: "https://bscscan.com",
    explorerTokenPath: "/token",
  },
  polygon: {
    address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    decimals: 6,
    explorer: "https://polygonscan.com",
    explorerTokenPath: "/token",
  },
  ethereum: {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    explorer: "https://etherscan.io",
    explorerTokenPath: "/token",
  },
};

export function getOfficialUsdtConfig(network: EvmNetwork = getDefaultEvmNetwork()) {
  return USDT_BY_NETWORK[network];
}

export function getOfficialUsdtContractAddress(network: EvmNetwork = getDefaultEvmNetwork()): Address {
  return getOfficialUsdtConfig(network).address;
}

export function getOfficialUsdtDecimals(network: EvmNetwork = getDefaultEvmNetwork()): number {
  return getOfficialUsdtConfig(network).decimals;
}

export function getBlockExplorerUrl(network: EvmNetwork = getDefaultEvmNetwork()): string {
  return getOfficialUsdtConfig(network).explorer;
}

export function getOfficialUsdtMeta(network: EvmNetwork = getDefaultEvmNetwork()) {
  const cfg = getOfficialUsdtConfig(network);
  return {
    network,
    contractAddress: cfg.address,
    decimals: cfg.decimals,
    name: "Tether USD",
    symbol: "USDT",
    issuer: "Tether Limited",
    explorerUrl: `${cfg.explorer}${cfg.explorerTokenPath}/${cfg.address}`,
  };
}

/** Retrocompatible — usa la red por defecto. */
export const OFFICIAL_USDT_EVM = {
  get contractAddress() {
    return getOfficialUsdtContractAddress();
  },
  get decimals() {
    return getOfficialUsdtDecimals();
  },
  name: "Tether USD",
  symbol: "USDT",
  issuer: "Tether Limited",
  get explorerUrl() {
    const cfg = getOfficialUsdtConfig();
    return `${cfg.explorer}${cfg.explorerTokenPath}/${cfg.address}`;
  },
} as const;

export function isOfficialUsdt(
  contractAddress: string,
  network: EvmNetwork = getDefaultEvmNetwork()
): boolean {
  return contractAddress.toLowerCase() === getOfficialUsdtContractAddress(network).toLowerCase();
}

export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}
