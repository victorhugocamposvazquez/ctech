import {
  createWalletClient,
  erc20Abi,
  formatUnits,
  http,
  isAddress,
  parseUnits,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { walletChain } from "./config";
import { getWalletRpcUrl } from "./rpc";

function parseTreasuryPrivateKey(): `0x${string}` | null {
  const raw = process.env.WALLET_TREASURY_PRIVATE_KEY?.trim();
  if (!raw) return null;
  const key = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (key.length !== 66) return null;
  return key as `0x${string}`;
}

export function getTreasuryAddress(): Address | null {
  const explicit = process.env.WALLET_TREASURY_ADDRESS?.trim();
  if (explicit && isAddress(explicit)) {
    return explicit as Address;
  }
  const key = parseTreasuryPrivateKey();
  if (!key) return null;
  return privateKeyToAccount(key).address;
}

export function isTreasuryConfigured(): boolean {
  return !!parseTreasuryPrivateKey();
}

function getTreasuryWalletClient() {
  const key = parseTreasuryPrivateKey();
  if (!key) {
    throw new Error(
      "WALLET_TREASURY_PRIVATE_KEY no está configurada. Sin treasury no se pueden enviar tokens on-chain."
    );
  }
  const account = privateKeyToAccount(key);
  return createWalletClient({
    account,
    chain: walletChain,
    transport: http(getWalletRpcUrl()),
  });
}

export async function treasuryTransferErc20(params: {
  tokenAddress: Address;
  to: Address;
  amount: string;
  decimals: number;
}): Promise<{ hash: Hash; amountRaw: bigint; amountFormatted: string }> {
  const client = getTreasuryWalletClient();
  const amountRaw = parseUnits(params.amount, params.decimals);

  if (amountRaw <= 0n) {
    throw new Error("La cantidad debe ser mayor que cero");
  }

  const hash = await client.writeContract({
    address: params.tokenAddress,
    abi: erc20Abi,
    functionName: "transfer",
    args: [params.to, amountRaw],
  });

  return {
    hash,
    amountRaw,
    amountFormatted: formatUnits(amountRaw, params.decimals),
  };
}

export async function treasuryTransferNative(params: {
  to: Address;
  amount: string;
}): Promise<{ hash: Hash; amountRaw: bigint; amountFormatted: string }> {
  const client = getTreasuryWalletClient();
  const amountRaw = parseUnits(params.amount, 18);

  if (amountRaw <= 0n) {
    throw new Error("La cantidad debe ser mayor que cero");
  }

  const hash = await client.sendTransaction({
    to: params.to,
    value: amountRaw,
  });

  return {
    hash,
    amountRaw,
    amountFormatted: formatUnits(amountRaw, 18),
  };
}
