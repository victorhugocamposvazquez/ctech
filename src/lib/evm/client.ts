import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  parseGwei,
  parseUnits,
  type Address,
  type Chain,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc, mainnet, polygon } from "viem/chains";
import {
  getDefaultEvmNetwork,
  getLabContractAddressForNetwork,
  getRpcUrlForNetwork,
  getTreasuryPrivateKeyForNetwork,
  isAnyEvmNetworkConfigured,
  isEvmNetworkConfigured,
  type EvmNetwork,
} from "./network";

export const LAB_TOKEN_DECIMALS = 6;

export const FLASH_USDT_LAB_ABI = [
  {
    type: "function",
    name: "injectTo",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "flashInject",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "durationSeconds", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "clearFlash",
    inputs: [{ name: "holder", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "burnFrom",
    inputs: [
      { name: "holder", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "flashBalanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "flashExpiresAt",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "realBalanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const CHAINS: Record<EvmNetwork, Chain> = {
  bsc,
  polygon,
  ethereum: mainnet,
};

export function isEvmConfigured(
  network?: EvmNetwork,
  labContractAddress?: string | null,
  treasuryPrivateKey?: `0x${string}` | null
): boolean {
  if (network) {
    return Boolean(
      (getTreasuryPrivateKeyForNetwork(network) || treasuryPrivateKey) &&
        (getLabContractAddressForNetwork(network) || labContractAddress)
    );
  }
  return isAnyEvmNetworkConfigured();
}

export function getLabContractAddress(
  network: EvmNetwork = getDefaultEvmNetwork(),
  override?: string | null
): Address {
  const addr = override ?? getLabContractAddressForNetwork(network);
  if (!addr) {
    throw new Error(`Contrato lab no configurado para ${network}`);
  }
  return addr as Address;
}

function getPrivateKey(network: EvmNetwork, override?: `0x${string}` | null): `0x${string}` {
  if (override) return override;
  let pk = getTreasuryPrivateKeyForNetwork(network) ?? "";
  if (!pk.startsWith("0x")) pk = `0x${pk}`;
  return pk as `0x${string}`;
}

export function getChain(network: EvmNetwork): Chain {
  return CHAINS[network];
}

function resolveRpcUrl(network: EvmNetwork): string {
  if (getRpcUrlForNetwork(network)) return getRpcUrlForNetwork(network)!;
  return getChain(network).rpcUrls.default.http[0]!;
}

/** Vercel Hobby corta funciones a ~10s — RPC debe responder mucho antes. */
const RPC_TIMEOUT_MS = 5_000;

function httpTransport(network: EvmNetwork) {
  return http(resolveRpcUrl(network), { timeout: RPC_TIMEOUT_MS });
}

export function getPublicClient(network: EvmNetwork) {
  return createPublicClient({
    chain: getChain(network),
    transport: httpTransport(network),
  });
}

export function getWalletClient(
  network: EvmNetwork,
  privateKeyOverride?: `0x${string}` | null
) {
  const account = privateKeyToAccount(getPrivateKey(network, privateKeyOverride));
  return createWalletClient({
    account,
    chain: getChain(network),
    transport: httpTransport(network),
  });
}

export function toLabTokenUnits(amount: number): bigint {
  return parseUnits(amount.toString(), LAB_TOKEN_DECIMALS);
}

export function fromLabTokenUnits(raw: bigint): string {
  return formatUnits(raw, LAB_TOKEN_DECIMALS);
}

export function toOfficialUsdtUnits(amount: number, decimals: number): bigint {
  return parseUnits(amount.toString(), decimals);
}

export function getPendingBaitMaxFeePerGas() {
  const gwei = process.env.EVM_PENDING_BAIT_MAX_FEE_GWEI ?? "0.05";
  return parseGwei(gwei);
}

export type { Address, Hash };
