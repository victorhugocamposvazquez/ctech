import { formatEther, parseUnits, type Address, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getExplorerTxUrl } from "./chain-config";
import { ERC20_ABI, getPublicClient, getWalletClient } from "./client";
import {
  getDexConfig,
  getPricePoolStatus,
  LAB_TOKEN_DECIMALS,
  PANCAKE_ROUTER_ABI,
} from "./liquidity-pool";
import type { EvmNetwork } from "./network";
import { getOfficialUsdtConfig } from "./usdt-canonical";

export type PoolCreateAfterStep = "start" | "mint" | "approve_lab" | "approve_usdt";

const LAB_POOL_ABI = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "realBalanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const ERC20_EXT_ABI = [
  ...ERC20_ABI,
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

const STEP_LABELS: Record<string, string> = {
  mint: "Acuñando fUSDT en treasury…",
  approve_lab: "Aprobando fUSDT en PancakeSwap…",
  approve_usdt: "Aprobando USDT en PancakeSwap…",
  add_liquidity: "Creando par fUSDT/USDT…",
};

function withRpcTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} — RPC lento (>${ms}ms)`)), ms)
    ),
  ]);
}

export function resolvePoolAmounts(usdtAmount: number, price: number, usdtDecimals: number) {
  const fusdtAmount = usdtAmount / price;
  return {
    fusdtAmount,
    fusdtUnits: parseUnits(fusdtAmount.toString(), LAB_TOKEN_DECIMALS),
    usdtUnits: parseUnits(usdtAmount.toString(), usdtDecimals),
  };
}

async function preflightCreatePool(
  network: EvmNetwork,
  labContractAddress: Address,
  treasuryAddress: Address,
  usdtUnits: bigint
) {
  const dex = getDexConfig(network);
  if (!dex) {
    throw new Error("Pool de precio solo disponible en BSC por ahora");
  }

  const pool = await getPricePoolStatus(network, labContractAddress);
  if (pool.exists) {
    throw new Error("Ya existe un pool para este token lab");
  }

  const publicClient = getPublicClient(network);
  const usdt = getOfficialUsdtConfig(network);

  const [owner, usdtBal, bnb] = await Promise.all([
    publicClient.readContract({
      address: labContractAddress,
      abi: LAB_POOL_ABI,
      functionName: "owner",
    }) as Promise<Address>,
    publicClient.readContract({
      address: usdt.address,
      abi: ERC20_EXT_ABI,
      functionName: "balanceOf",
      args: [treasuryAddress],
    }) as Promise<bigint>,
    publicClient.getBalance({ address: treasuryAddress }),
  ]);

  if (owner.toLowerCase() !== treasuryAddress.toLowerCase()) {
    throw new Error("La treasury no es owner del contrato lab");
  }
  if (usdtBal < usdtUnits) {
    const needed = formatEther(usdtUnits);
    throw new Error(
      `USDT insuficiente en treasury. Necesitas ${needed} USDT (BEP20 en BSC).`
    );
  }
  if (bnb < parseUnits("0.003", 18)) {
    throw new Error("BNB insuficiente para gas (~0.003 BNB)");
  }

  return { dex, usdt };
}

export async function executePricePoolStep(input: {
  network: EvmNetwork;
  labContractAddress: Address;
  treasuryPrivateKey: `0x${string}`;
  usdtAmount: number;
  price: number;
  afterStep: PoolCreateAfterStep;
}): Promise<{
  success: boolean;
  step: string;
  stepLabel: string;
  skipped?: boolean;
  txHash?: Hash;
  txExplorerUrl?: string;
  nextAfterStep?: PoolCreateAfterStep | "done";
  error?: string;
}> {
  const { network, labContractAddress, treasuryPrivateKey, usdtAmount, price, afterStep } = input;

  if (usdtAmount <= 0 || price <= 0) {
    return { success: false, step: afterStep, stepLabel: "", error: "usdtAmount y price deben ser > 0" };
  }

  const account = privateKeyToAccount(treasuryPrivateKey);
  const usdtCfg = getOfficialUsdtConfig(network);
  const { fusdtUnits, usdtUnits } = resolvePoolAmounts(usdtAmount, price, usdtCfg.decimals);

  try {
    const dex = getDexConfig(network);
    if (!dex) {
      return { success: false, step: afterStep, stepLabel: "", error: "Solo BSC soportado" };
    }

    const publicClient = getPublicClient(network);
    const walletClient = getWalletClient(network, treasuryPrivateKey);

    if (afterStep === "start") {
      await preflightCreatePool(network, labContractAddress, account.address, usdtUnits);

      const realFusdt = (await publicClient.readContract({
        address: labContractAddress,
        abi: LAB_POOL_ABI,
        functionName: "realBalanceOf",
        args: [account.address],
      })) as bigint;

      if (realFusdt >= fusdtUnits) {
        return {
          success: true,
          step: "mint",
          stepLabel: STEP_LABELS.mint,
          skipped: true,
          nextAfterStep: "mint",
        };
      }

      const txHash = await withRpcTimeout(
        walletClient.writeContract({
          address: labContractAddress,
          abi: LAB_POOL_ABI,
          functionName: "mint",
          args: [account.address, fusdtUnits],
        }),
        8_000,
        "mint"
      );

      return {
        success: true,
        step: "mint",
        stepLabel: STEP_LABELS.mint,
        txHash,
        txExplorerUrl: getExplorerTxUrl(network, txHash),
        nextAfterStep: "mint",
      };
    }

    if (afterStep === "mint") {
      const allowance = (await publicClient.readContract({
        address: labContractAddress,
        abi: ERC20_EXT_ABI,
        functionName: "allowance",
        args: [account.address, dex.router],
      })) as bigint;

      if (allowance >= fusdtUnits) {
        return {
          success: true,
          step: "approve_lab",
          stepLabel: STEP_LABELS.approve_lab,
          skipped: true,
          nextAfterStep: "approve_lab",
        };
      }

      const txHash = await withRpcTimeout(
        walletClient.writeContract({
          address: labContractAddress,
          abi: ERC20_EXT_ABI,
          functionName: "approve",
          args: [dex.router, fusdtUnits],
        }),
        8_000,
        "approve fUSDT"
      );

      return {
        success: true,
        step: "approve_lab",
        stepLabel: STEP_LABELS.approve_lab,
        txHash,
        txExplorerUrl: getExplorerTxUrl(network, txHash),
        nextAfterStep: "approve_lab",
      };
    }

    if (afterStep === "approve_lab") {
      const allowance = (await publicClient.readContract({
        address: usdtCfg.address,
        abi: ERC20_EXT_ABI,
        functionName: "allowance",
        args: [account.address, dex.router],
      })) as bigint;

      if (allowance >= usdtUnits) {
        return {
          success: true,
          step: "approve_usdt",
          stepLabel: STEP_LABELS.approve_usdt,
          skipped: true,
          nextAfterStep: "approve_usdt",
        };
      }

      const txHash = await withRpcTimeout(
        walletClient.writeContract({
          address: usdtCfg.address,
          abi: ERC20_EXT_ABI,
          functionName: "approve",
          args: [dex.router, usdtUnits],
        }),
        8_000,
        "approve USDT"
      );

      return {
        success: true,
        step: "approve_usdt",
        stepLabel: STEP_LABELS.approve_usdt,
        txHash,
        txExplorerUrl: getExplorerTxUrl(network, txHash),
        nextAfterStep: "approve_usdt",
      };
    }

    if (afterStep === "approve_usdt") {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
      const minA = (fusdtUnits * BigInt(95)) / BigInt(100);
      const minB = (usdtUnits * BigInt(95)) / BigInt(100);

      const txHash = await withRpcTimeout(
        walletClient.writeContract({
          address: dex.router,
          abi: PANCAKE_ROUTER_ABI,
          functionName: "addLiquidity",
          args: [
            labContractAddress,
            usdtCfg.address,
            fusdtUnits,
            usdtUnits,
            minA,
            minB,
            account.address,
            deadline,
          ],
        }),
        8_000,
        "addLiquidity"
      );

      return {
        success: true,
        step: "add_liquidity",
        stepLabel: STEP_LABELS.add_liquidity,
        txHash,
        txExplorerUrl: getExplorerTxUrl(network, txHash),
        nextAfterStep: "done",
      };
    }

    return { success: false, step: afterStep, stepLabel: "", error: "Paso inválido" };
  } catch (err) {
    return {
      success: false,
      step: afterStep,
      stepLabel: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function confirmPricePoolTx(
  network: EvmNetwork,
  txHash: Hash
): Promise<{ pending: boolean; confirmed: boolean; failed?: boolean; txExplorerUrl: string }> {
  const publicClient = getPublicClient(network);
  const txExplorerUrl = getExplorerTxUrl(network, txHash);

  const receipt = await publicClient.getTransactionReceipt({ hash: txHash }).catch(() => null);
  if (!receipt) {
    const tx = await publicClient.getTransaction({ hash: txHash }).catch(() => null);
    return { pending: Boolean(tx), confirmed: false, txExplorerUrl };
  }

  return {
    pending: false,
    confirmed: receipt.status === "success",
    failed: receipt.status === "reverted",
    txExplorerUrl,
  };
}
