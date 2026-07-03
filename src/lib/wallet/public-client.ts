import { createPublicClient, http, type PublicClient } from "viem";
import { walletChain } from "./config";
import { getWalletRpcUrl } from "./rpc";

let client: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (!client) {
    const rpc = getWalletRpcUrl();
    client = createPublicClient({
      chain: walletChain,
      transport: http(rpc),
    });
  }
  return client;
}
