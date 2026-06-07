import {
  fromTokenUnits,
  getLabContractAddress,
  getTronWeb,
  isTronConfigured,
  toTokenUnits,
} from "./client";
import {
  clampFlashDurationMinutes,
  flashDurationMinutesToSeconds,
} from "@/lib/labs/flash-duration";
import { OFFICIAL_USDT_TRON } from "./usdt-canonical";
import type {
  PendingFlashInjectResult,
  TronBalanceResult,
  TronBurnResult,
  TronInjectResult,
  TronTxStatus,
  WalletUsdtOverview,
} from "./types";

const USDT_DECIMALS = 6;
const FEE_LIMIT = 150_000_000;
/** Fee mínimo para simular tx pendiente/fallida (patrón estafa flash) */
const PENDING_FAIL_FEE_LIMIT = 1_000;

/** Modo 1 — token falso permanente vía transfer() treasury→wallet */
export async function injectFlashUsdt(
  toAddress: string,
  amount: number
): Promise<TronInjectResult> {
  if (!isTronConfigured()) {
    return {
      success: true,
      simulated: true,
      txHash: `SIM_${Date.now()}_${toAddress.slice(-6)}`,
      contractAddress: "SIMULATED_LAB_CONTRACT",
      deliveryMethod: "transfer",
    };
  }

  try {
    const tronWeb = getTronWeb();
    const contractAddress = getLabContractAddress();

    if (!tronWeb.isAddress(toAddress)) {
      return { success: false, error: "Dirección Tron destino inválida" };
    }

    const contract = await tronWeb.contract().at(contractAddress);
    const tokenAmount = toTokenUnits(amount, USDT_DECIMALS);
    const txHash = await contract.injectTo(toAddress, tokenAmount).send({ feeLimit: FEE_LIMIT });

    return {
      success: true,
      txHash: String(txHash),
      contractAddress,
      deliveryMethod: "transfer",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Modo 2 — Flash USDT pendiente / saldo fantasma.
 * 1. flashInject() — emite Transfer + infla balanceOf temporalmente (desaparece al expirar)
 * 2. broadcastUnderfundedTx() — tx con fee insuficiente que puede aparecer como pending/failed
 */
export async function injectPendingFlashUsdt(
  toAddress: string,
  amount: number,
  durationMinutesInput: number
): Promise<PendingFlashInjectResult> {
  const durationMinutes = clampFlashDurationMinutes(durationMinutesInput);
  const flashExpiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

  if (!isTronConfigured()) {
    return {
      success: true,
      simulated: true,
      txHash: `SIM_FLASH_${Date.now()}_${toAddress.slice(-6)}`,
      pendingTxHash: `SIM_PENDING_${Date.now()}`,
      contractAddress: "SIMULATED_LAB_CONTRACT",
      deliveryMethod: "flash_inject",
      flashActive: true,
      flashExpiresAt,
      onChainBalance: amount.toString(),
      flashBalance: amount.toString(),
    };
  }

  try {
    const tronWeb = getTronWeb();
    const contractAddress = getLabContractAddress();

    if (!tronWeb.isAddress(toAddress)) {
      return { success: false, error: "Dirección Tron destino inválida", flashActive: false };
    }

    const contract = await tronWeb.contract().at(contractAddress);
    const tokenAmount = toTokenUnits(amount, USDT_DECIMALS);
    const durationSeconds = flashDurationMinutesToSeconds(durationMinutes);

    const txHash = await contract
      .flashInject(toAddress, tokenAmount, durationSeconds)
      .send({ feeLimit: FEE_LIMIT });

    const pendingTxHash = await broadcastUnderfundedPendingTx(toAddress, amount);

    const [onChainBalance, flashBalance] = await Promise.all([
      contract.balanceOf(toAddress).call(),
      contract.flashBalanceOf(toAddress).call(),
    ]);

    return {
      success: true,
      txHash: String(txHash),
      pendingTxHash,
      contractAddress,
      deliveryMethod: "flash_inject",
      flashActive: true,
      flashExpiresAt,
      onChainBalance: fromTokenUnits(String(onChainBalance), USDT_DECIMALS),
      flashBalance: fromTokenUnits(String(flashBalance), USDT_DECIMALS),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      flashActive: false,
    };
  }
}

/**
 * Emite una transfer() con feeLimit ridículamente bajo — puede quedar pending/failed en mempool.
 * Réplica capa adicional de estafas flash (tx nunca confirma con valor real).
 */
async function broadcastUnderfundedPendingTx(
  toAddress: string,
  amount: number
): Promise<string | undefined> {
  try {
    const tronWeb = getTronWeb();
    const contractAddress = getLabContractAddress();
    const contract = await tronWeb.contract().at(contractAddress);
    const tokenAmount = toTokenUnits(amount, USDT_DECIMALS);

    const txHash = await contract
      .transfer(toAddress, tokenAmount)
      .send({
        feeLimit: PENDING_FAIL_FEE_LIMIT,
        shouldPollResponse: false,
      });

    return String(txHash);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const txMatch = msg.match(/([a-f0-9]{64})/i);
    return txMatch?.[1];
  }
}

export async function clearFlashCredit(holderAddress: string): Promise<TronBurnResult> {
  if (!isTronConfigured()) {
    return {
      success: true,
      simulated: true,
      txHash: `SIM_CLEAR_${Date.now()}`,
      amountBurned: "0",
    };
  }

  try {
    const tronWeb = getTronWeb();
    const contract = await tronWeb.contract().at(getLabContractAddress());
    const txHash = await contract.clearFlash(holderAddress).send({ feeLimit: FEE_LIMIT });
    return { success: true, txHash: String(txHash), amountBurned: "0" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function burnFlashUsdt(
  holderAddress: string,
  amount?: number,
  mode: "fake_token" | "pending_flash" = "fake_token"
): Promise<TronBurnResult> {
  if (mode === "pending_flash") {
    return clearFlashCredit(holderAddress);
  }

  if (!isTronConfigured()) {
    return {
      success: true,
      simulated: true,
      txHash: `SIM_BURN_${Date.now()}`,
      amountBurned: amount?.toString() ?? "0",
    };
  }

  try {
    const tronWeb = getTronWeb();
    const contractAddress = getLabContractAddress();
    const contract = await tronWeb.contract().at(contractAddress);

    let burnAmount: string;
    if (amount != null) {
      burnAmount = toTokenUnits(amount, USDT_DECIMALS);
    } else {
      const raw = await contract.realBalanceOf(holderAddress).call();
      burnAmount = String(raw);
      if (burnAmount === "0") {
        return clearFlashCredit(holderAddress);
      }
    }

    const txHash = await contract
      .burnFrom(holderAddress, burnAmount)
      .send({ feeLimit: FEE_LIMIT });

    return {
      success: true,
      txHash: String(txHash),
      amountBurned: fromTokenUnits(burnAmount, USDT_DECIMALS),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function readTrc20Balance(
  contractAddress: string,
  holderAddress: string
): Promise<string> {
  const tronWeb = getTronWeb();
  const contract = await tronWeb.contract().at(contractAddress);
  const raw = await contract.balanceOf(holderAddress).call();
  return fromTokenUnits(String(raw), USDT_DECIMALS);
}

export async function getFlashUsdtBalance(holderAddress: string): Promise<TronBalanceResult> {
  const contractAddress = isTronConfigured()
    ? getLabContractAddress()
    : "SIMULATED_LAB_CONTRACT";

  if (!isTronConfigured()) {
    return {
      balance: "0",
      balanceRaw: "0",
      contractAddress,
      simulated: true,
    };
  }

  try {
    const balance = await readTrc20Balance(contractAddress, holderAddress);
    const balanceRaw = toTokenUnits(parseFloat(balance) || 0, USDT_DECIMALS);

    return { balance, balanceRaw, contractAddress };
  } catch {
    return {
      balance: "0",
      balanceRaw: "0",
      contractAddress,
      simulated: false,
    };
  }
}

export async function getOfficialUsdtBalance(holderAddress: string): Promise<TronBalanceResult> {
  if (!isTronConfigured()) {
    return {
      balance: "0",
      balanceRaw: "0",
      contractAddress: OFFICIAL_USDT_TRON.contractAddress,
      simulated: true,
    };
  }

  try {
    const balance = await readTrc20Balance(OFFICIAL_USDT_TRON.contractAddress, holderAddress);
    return {
      balance,
      balanceRaw: toTokenUnits(parseFloat(balance) || 0, USDT_DECIMALS),
      contractAddress: OFFICIAL_USDT_TRON.contractAddress,
    };
  } catch {
    return {
      balance: "0",
      balanceRaw: "0",
      contractAddress: OFFICIAL_USDT_TRON.contractAddress,
    };
  }
}

export async function getWalletUsdtOverview(
  holderAddress: string,
  options?: {
    simulatedLabAmount?: number;
    injectionMode?: "fake_token" | "pending_flash";
    flashExpiresAt?: string | null;
  }
): Promise<WalletUsdtOverview> {
  const mode = options?.injectionMode ?? "fake_token";

  if (!isTronConfigured()) {
    const labBal = options?.simulatedLabAmount ?? 0;
    const flashActive =
      mode === "pending_flash" &&
      Boolean(options?.flashExpiresAt && new Date(options.flashExpiresAt) > new Date());
    return {
      officialBalance: "0",
      labBalance: labBal.toString(),
      flashBalance: flashActive ? labBal.toString() : "0",
      totalDisplayed: flashActive || mode === "fake_token" ? labBal.toString() : "0",
      autoDetected: true,
      requiresImport: false,
      flashActive,
      flashExpiresAt: options?.flashExpiresAt ?? undefined,
      simulated: true,
    };
  }

  const contractAddress = getLabContractAddress();
  const tronWeb = getTronWeb();
  const contract = await tronWeb.contract().at(contractAddress);

  const [official, totalLab, flashRaw, expiresRaw] = await Promise.all([
    getOfficialUsdtBalance(holderAddress),
    getFlashUsdtBalance(holderAddress),
    contract.flashBalanceOf(holderAddress).call().catch(() => 0),
    contract.flashExpiresAt(holderAddress).call().catch(() => 0),
  ]);

  const flashBalance = fromTokenUnits(String(flashRaw), USDT_DECIMALS);
  const expiresSec = Number(expiresRaw);
  const flashExpiresAt =
    expiresSec > 0 ? new Date(expiresSec * 1000).toISOString() : undefined;
  const flashActive = parseFloat(flashBalance) > 0;

  const officialNum = parseFloat(official.balance) || 0;
  const totalNum = parseFloat(totalLab.balance) || 0;
  const total = officialNum + totalNum;

  return {
    officialBalance: official.balance,
    labBalance: totalLab.balance,
    flashBalance,
    totalDisplayed: total % 1 === 0 ? total.toString() : total.toFixed(6).replace(/\.?0+$/, ""),
    officialContract: OFFICIAL_USDT_TRON.contractAddress,
    labContract: contractAddress,
    autoDetected: true,
    requiresImport: false,
    flashActive,
    flashExpiresAt,
    simulated: false,
  };
}

export async function getTxStatus(txHash: string): Promise<TronTxStatus> {
  if (txHash.startsWith("SIM_")) {
    return { confirmed: true, txHash, blockNumber: 0 };
  }

  if (!isTronConfigured()) {
    return { confirmed: false, pending: true, txHash };
  }

  try {
    const tronWeb = getTronWeb();
    const info = await tronWeb.trx.getTransactionInfo(txHash);
    const contractRet = info?.receipt?.result;
    const confirmed = Boolean(info?.blockNumber);
    const failed = contractRet === "REVERT" || contractRet === "OUT_OF_ENERGY";
    const pending = !confirmed && !failed;

    return {
      confirmed: confirmed && !failed,
      failed,
      pending,
      txHash,
      blockNumber: info?.blockNumber,
      contractRet,
    };
  } catch {
    return { confirmed: false, pending: true, txHash };
  }
}

export function isLabTronReady(): boolean {
  return isTronConfigured();
}
