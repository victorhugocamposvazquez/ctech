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
import { getEvmNetwork } from "./network";

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

const CHAINS: Record<ReturnType<typeof getEvmNetwork>, Chain> = {
  bsc,
  polygon,
  ethereum: mainnet,
};

export function isEvmConfigured(): boolean {
  return Boolean(
    process.env.EVM_LAB_TREASURY_PRIVATE_KEY && process.env.EVM_FLASH_USDT_LAB_CONTRACT
  );
}

export function getLabContractAddress(): Address {
  const addr = process.env.EVM_FLASH_USDT_LAB_CONTRACT;
  if (!addr) throw new Error("EVM_FLASH_USDT_LAB_CONTRACT no configurada");
  return addr as Address;
}

function getPrivateKey(): `0x${string}` {
  let pk = process.env.EVM_LAB_TREASURY_PRIVATE_KEY ?? "";
  if (!pk.startsWith("0x")) pk = `0x${pk}`;
  return pk as `0x${string}`;
}

export function getChain(): Chain {
  return CHAINS[getEvmNetwork()];
}

function getRpcUrl(): string {
  if (process.env.EVM_RPC_URL) return process.env.EVM_RPC_URL;
  return getChain().rpcUrls.default.http[0]!;
}

export function getPublicClient() {
  return createPublicClient({
    chain: getChain(),
    transport: http(getRpcUrl()),
  });
}

export function getWalletClient() {
  const account = privateKeyToAccount(getPrivateKey());
  return createWalletClient({
    account,
    chain: getChain(),
    transport: http(getRpcUrl()),
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
