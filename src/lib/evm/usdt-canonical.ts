import type { Address } from "viem";
import { getEvmNetwork, type EvmNetwork } from "./network";

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

export function getOfficialUsdtConfig() {
  return USDT_BY_NETWORK[getEvmNetwork()];
}

export function getOfficialUsdtContractAddress(): Address {
  return getOfficialUsdtConfig().address;
}

export function getOfficialUsdtDecimals(): number {
  return getOfficialUsdtConfig().decimals;
}

export function getBlockExplorerUrl(): string {
  return getOfficialUsdtConfig().explorer;
}

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
    return `${getBlockExplorerUrl()}${getOfficialUsdtConfig().explorerTokenPath}/${getOfficialUsdtContractAddress()}`;
  },
} as const;

export function isOfficialUsdt(contractAddress: string): boolean {
  return contractAddress.toLowerCase() === getOfficialUsdtContractAddress().toLowerCase();
}

export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}
