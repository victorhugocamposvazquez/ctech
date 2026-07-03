import { createPublicClient, http, type PublicClient } from "viem";
import { walletChain } from "./config";

let client: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (!client) {
    client = createPublicClient({
      chain: walletChain,
      transport: http(),
    });
  }
  return client;
}
