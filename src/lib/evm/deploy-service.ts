import { readFileSync } from "node:fs";
import { join } from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import { formatEther, type Address, type Hash } from "viem";
import { getFlashUsdTLabArtifact } from "./contract-artifact";
import { EVM_CHAIN_IDS, getExplorerContractUrl, getExplorerTxUrl } from "./chain-config";
import { getPublicClient, getWalletClient } from "./client";
import type { EvmNetwork } from "./network";
import { getTreasuryPrivateKeyForNetwork } from "./network";
import { normalizePrivateKey } from "./treasury-registry";

export function getTreasuryAddress(network: EvmNetwork): Address | null {
  const pk = getTreasuryPrivateKeyForNetwork(network);
  if (!pk) return null;
  const normalized = pk.startsWith("0x") ? pk : `0x${pk}`;
  try {
    return privateKeyToAccount(normalized as `0x${string}`).address;
  } catch {
    return null;
  }
}

export async function getTreasuryNativeBalance(
  network: EvmNetwork,
  addressOverride?: Address
): Promise<{ address: Address; balance: string; symbol: string } | null> {
  const address = addressOverride ?? getTreasuryAddress(network);
  if (!address) return null;

  const publicClient = getPublicClient(network);
  const wei = await publicClient.getBalance({ address });
  const symbol = network === "bsc" ? "BNB" : network === "ethereum" ? "ETH" : "MATIC";
  return { address, balance: formatEther(wei), symbol };
}

function resolveDeployKey(treasuryPrivateKey?: `0x${string}` | null): `0x${string}` | null {
  return (
    treasuryPrivateKey ??
    normalizePrivateKey(getTreasuryPrivateKeyForNetwork("bsc") ?? "")
  );
}

/** Envía la tx de deploy y devuelve al instante (evita timeout en Vercel). */
export async function startFlashUsdTLabDeploy(
  network: EvmNetwork,
  treasuryPrivateKey?: `0x${string}` | null
): Promise<{
  success: boolean;
  txHash?: Hash;
  txExplorerUrl?: string;
  error?: string;
}> {
  const resolvedKey = resolveDeployKey(treasuryPrivateKey);
  if (!resolvedKey) {
    return { success: false, error: "Treasury no configurada" };
  }

  try {
    const artifact = getFlashUsdTLabArtifact();
    const walletClient = getWalletClient(network, resolvedKey);
    const hash = await walletClient.deployContract({
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      args: [],
    });

    return {
      success: true,
      txHash: hash,
      txExplorerUrl: getExplorerTxUrl(network, hash),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Consulta receipt sin bloquear (ideal para polling desde Vercel). */
export async function confirmFlashUsdTLabDeploy(
  network: EvmNetwork,
  txHash: Hash
): Promise<{
  success: boolean;
  contractAddress?: Address;
  txHash?: Hash;
  explorerUrl?: string;
  txExplorerUrl?: string;
  pending?: boolean;
  error?: string;
}> {
  const txExplorerUrl = getExplorerTxUrl(network, txHash);

  try {
    const publicClient = getPublicClient(network);
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

    if (!receipt) {
      return { success: false, pending: true, txHash, txExplorerUrl };
    }

    const contractAddress = receipt.contractAddress;
    if (!contractAddress) {
      return {
        success: false,
        error: "Deploy sin contractAddress en receipt",
        txHash,
        txExplorerUrl,
      };
    }

    return {
      success: true,
      contractAddress,
      txHash,
      explorerUrl: getExplorerContractUrl(network, contractAddress),
      txExplorerUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("not found") || message.toLowerCase().includes("pending")) {
      return { success: false, pending: true, txHash, txExplorerUrl };
    }
    return { success: false, error: message, txHash, txExplorerUrl };
  }
}

/** Deploy síncrono (cron/scripts). */
export async function deployFlashUsdTLab(
  network: EvmNetwork,
  treasuryPrivateKey?: `0x${string}` | null
): Promise<{
  success: boolean;
  contractAddress?: Address;
  txHash?: Hash;
  explorerUrl?: string;
  txExplorerUrl?: string;
  error?: string;
}> {
  const started = await startFlashUsdTLabDeploy(network, treasuryPrivateKey);
  if (!started.success || !started.txHash) {
    return { success: false, error: started.error };
  }

  for (let attempt = 0; attempt < 40; attempt++) {
    const result = await confirmFlashUsdTLabDeploy(network, started.txHash);
    if (result.success) return result;
    if (!result.pending) return { success: false, error: result.error, txHash: started.txHash };
    await new Promise((r) => setTimeout(r, 3000));
  }

  return { success: false, error: "Timeout esperando confirmación on-chain", txHash: started.txHash };
}

function getExplorerApiKey(): string | null {
  return process.env.EVM_EXPLORER_API_KEY ?? process.env.ETHERSCAN_API_KEY ?? null;
}

export function isExplorerVerificationAvailable(): boolean {
  return Boolean(getExplorerApiKey());
}

function getFlashUsdTLabSourceCode(): string {
  return readFileSync(join(process.cwd(), "contracts/evm/FlashUSDTLab.sol"), "utf8");
}

export async function submitContractVerification(
  network: EvmNetwork,
  contractAddress: string
): Promise<{ success: boolean; guid?: string; error?: string }> {
  const apiKey = getExplorerApiKey();
  if (!apiKey) {
    return {
      success: false,
      error: "Falta EVM_EXPLORER_API_KEY (Etherscan API v2, válida para BSC/Ethereum/Polygon)",
    };
  }

  const artifact = getFlashUsdTLabArtifact();
  const sourceCode = getFlashUsdTLabSourceCode();

  const params = new URLSearchParams({
    chainid: String(EVM_CHAIN_IDS[network]),
    module: "contract",
    action: "verifysourcecode",
    apikey: apiKey,
    contractaddress: contractAddress,
    sourceCode,
    codeformat: "solidity-single-file",
    contractname: `${artifact.contractName}`,
    compilerversion: artifact.compilerVersion,
    optimizationUsed: "1",
    runs: String(artifact.optimizationRuns),
    licenseType: "3",
  });

  try {
    const res = await fetch("https://api.etherscan.io/v2/api", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const json = (await res.json()) as {
      status?: string;
      message?: string;
      result?: string;
    };

    if (json.status === "1" && json.result) {
      return { success: true, guid: json.result };
    }

    return {
      success: false,
      error: json.result ?? json.message ?? "Error desconocido al verificar",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function checkContractVerificationStatus(
  network: EvmNetwork,
  guid: string
): Promise<{
  status: "pending" | "verified" | "failed";
  error?: string;
}> {
  const apiKey = getExplorerApiKey();
  if (!apiKey) {
    return { status: "failed", error: "Falta EVM_EXPLORER_API_KEY" };
  }

  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", String(EVM_CHAIN_IDS[network]));
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "checkverifystatus");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("guid", guid);

  try {
    const res = await fetch(url.toString());
    const json = (await res.json()) as { status?: string; result?: string };

    const result = String(json.result ?? "").toLowerCase();
    if (result.includes("pass") || result.includes("success") || result.includes("verified")) {
      return { status: "verified" };
    }
    if (result.includes("pending") || result.includes("in queue")) {
      return { status: "pending" };
    }
    if (json.status === "0") {
      return { status: "failed", error: json.result ?? "Verificación fallida" };
    }
    return { status: "pending" };
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function readOnChainContractMeta(
  network: EvmNetwork,
  contractAddress: Address
): Promise<{ name: string; symbol: string; decimals: number; owner: Address } | null> {
  try {
    const publicClient = getPublicClient(network);
    const artifact = getFlashUsdTLabArtifact();
    const [name, symbol, decimals, owner] = await publicClient.multicall({
      contracts: [
        { address: contractAddress, abi: artifact.abi, functionName: "name" },
        { address: contractAddress, abi: artifact.abi, functionName: "symbol" },
        { address: contractAddress, abi: artifact.abi, functionName: "decimals" },
        { address: contractAddress, abi: artifact.abi, functionName: "owner" },
      ],
    });

    if (
      name.status !== "success" ||
      symbol.status !== "success" ||
      decimals.status !== "success" ||
      owner.status !== "success"
    ) {
      return null;
    }

    return {
      name: name.result as string,
      symbol: symbol.result as string,
      decimals: Number(decimals.result),
      owner: owner.result as Address,
    };
  } catch {
    return null;
  }
}
