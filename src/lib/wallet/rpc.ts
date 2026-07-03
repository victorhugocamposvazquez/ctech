import { walletChain } from "./config";

export function getWalletRpcUrl(): string | undefined {
  return walletChain.id === 97
    ? process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL
    : process.env.NEXT_PUBLIC_BSC_RPC_URL;
}
