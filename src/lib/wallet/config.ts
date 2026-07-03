import { createConfig, http } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const chainId = Number(process.env.NEXT_PUBLIC_WALLET_CHAIN_ID ?? "56");
export const walletChain = chainId === 97 ? bscTestnet : bsc;

export const wagmiConfig = createConfig({
  chains: [walletChain],
  connectors: [injected()],
  transports: {
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC_URL),
    [bscTestnet.id]: http(process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL),
  },
  ssr: true,
});

export const APP_NAME = process.env.NEXT_PUBLIC_WALLET_APP_NAME ?? "Trust Wallet";
