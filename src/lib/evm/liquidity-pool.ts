import { formatUnits, type Address } from "viem";
import { getPublicClient } from "./client";
import { getOfficialUsdtConfig } from "./usdt-canonical";
import type { EvmNetwork } from "./network";

/**
 * Pool de precio en un DEX (PancakeSwap en BSC). Darle al token lab un par
 * fUSDT/USDT fija su precio on-chain (= ratio de reservas). Wallets que leen
 * precio on-chain (MetaMask/CoinGecko, SafePal/DeBank, Rabby) y webs como
 * DexScreener/GeckoTerminal entonces valoran el saldo del alumno.
 *
 * NO sirve para Trust Wallet (usa CoinMarketCap, que exige listado formal).
 */

export const LAB_TOKEN_DECIMALS = 6;

type DexConfig = {
  /** Router V2 (UniswapV2-compatible). */
  router: Address;
  factory: Address;
  dexName: string;
  dexScreenerChain: string;
  geckoTerminalChain: string;
};

/** Solo BSC tiene pool de precio soportado en el lab por ahora. */
const DEX_BY_NETWORK: Partial<Record<EvmNetwork, DexConfig>> = {
  bsc: {
    router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    factory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
    dexName: "PancakeSwap V2",
    dexScreenerChain: "bsc",
    geckoTerminalChain: "bsc",
  },
};

export function getDexConfig(network: EvmNetwork): DexConfig | null {
  return DEX_BY_NETWORK[network] ?? null;
}

export const PANCAKE_ROUTER_ABI = [
  {
    type: "function",
    name: "addLiquidity",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "amountADesired", type: "uint256" },
      { name: "amountBDesired", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
  },
] as const;

export const PANCAKE_FACTORY_ABI = [
  {
    type: "function",
    name: "getPair",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pair", type: "address" }],
  },
] as const;

export const PAIR_ABI = [
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" },
    ],
  },
  {
    type: "function",
    name: "token0",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "token1",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Wallets que suelen mostrar precio on-chain vía pool DEX (CoinGecko/DeBank/DEX APIs). */
export const PRICE_POOL_WALLET_COMPAT = {
  likely: [
    { name: "MetaMask", source: "CoinGecko / GeckoTerminal" },
    { name: "SafePal", source: "DeBank / on-chain" },
    { name: "Rabby", source: "DeBank" },
    { name: "OKX Wallet", source: "on-chain / agregadores" },
    { name: "Bitget Wallet", source: "on-chain / agregadores" },
    { name: "Coinbase Wallet", source: "CoinGecko (parcial)" },
  ],
  unlikely: [
    { name: "Trust Wallet", reason: "Solo CoinMarketCap con listado formal — no lee pools DEX" },
  ],
} as const;

export type PricePoolStatus = {
  supported: boolean;
  dexName?: string;
  exists: boolean;
  pairAddress?: Address;
  /** Precio del token lab en USDT (≈ USD). */
  priceUsd?: number;
  reservesLab?: string;
  reservesUsdt?: string;
  dexScreenerUrl?: string;
  geckoTerminalUrl?: string;
  error?: string;
};

/**
 * Lee el estado del pool fUSDT/USDT para una dirección de contrato lab.
 * Solo lectura: seguro para Vercel (1-2 llamadas RPC).
 */
export async function getPricePoolStatus(
  network: EvmNetwork,
  labContractAddress: Address
): Promise<PricePoolStatus> {
  const dex = getDexConfig(network);
  if (!dex) return { supported: false, exists: false };

  const usdt = getOfficialUsdtConfig(network);

  try {
    const publicClient = getPublicClient(network);
    const pairAddress = (await publicClient.readContract({
      address: dex.factory,
      abi: PANCAKE_FACTORY_ABI,
      functionName: "getPair",
      args: [labContractAddress, usdt.address],
    })) as Address;

    const dexScreenerUrl = `https://dexscreener.com/${dex.dexScreenerChain}/${labContractAddress}`;
    const geckoTerminalUrl = `https://www.geckoterminal.com/${dex.geckoTerminalChain}/tokens/${labContractAddress}`;

    if (!pairAddress || pairAddress.toLowerCase() === ZERO_ADDRESS) {
      return {
        supported: true,
        dexName: dex.dexName,
        exists: false,
        dexScreenerUrl,
        geckoTerminalUrl,
      };
    }

    const [reserves, token0] = await Promise.all([
      publicClient.readContract({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: "getReserves",
      }) as Promise<readonly [bigint, bigint, number]>,
      publicClient.readContract({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: "token0",
      }) as Promise<Address>,
    ]);

    const labIsToken0 = token0.toLowerCase() === labContractAddress.toLowerCase();
    const reserveLabRaw = labIsToken0 ? reserves[0] : reserves[1];
    const reserveUsdtRaw = labIsToken0 ? reserves[1] : reserves[0];

    const reserveLab = parseFloat(formatUnits(reserveLabRaw, LAB_TOKEN_DECIMALS));
    const reserveUsdt = parseFloat(formatUnits(reserveUsdtRaw, usdt.decimals));
    const priceUsd = reserveLab > 0 ? reserveUsdt / reserveLab : 0;

    return {
      supported: true,
      dexName: dex.dexName,
      exists: true,
      pairAddress,
      priceUsd,
      reservesLab: reserveLab.toString(),
      reservesUsdt: reserveUsdt.toString(),
      dexScreenerUrl,
      geckoTerminalUrl,
    };
  } catch (err) {
    return {
      supported: true,
      dexName: dex.dexName,
      exists: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
