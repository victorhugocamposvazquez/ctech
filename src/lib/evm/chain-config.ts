import type { EvmNetwork } from "./network";
import { getBlockExplorerUrl } from "./usdt-canonical";

export const EVM_CHAIN_IDS: Record<EvmNetwork, number> = {
  bsc: 56,
  ethereum: 1,
  polygon: 137,
};

export function getExplorerContractUrl(network: EvmNetwork, address: string): string {
  return `${getBlockExplorerUrl(network)}/address/${address}`;
}

export function getExplorerTxUrl(network: EvmNetwork, txHash: string): string {
  return `${getBlockExplorerUrl(network)}/tx/${txHash}`;
}
