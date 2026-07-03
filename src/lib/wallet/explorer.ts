import { walletChain } from "./config";

export function txExplorerUrl(hash: string): string {
  const base =
    walletChain.id === 97
      ? "https://testnet.bscscan.com"
      : "https://bscscan.com";
  return `${base}/tx/${hash}`;
}

export function addressExplorerUrl(address: string): string {
  const base =
    walletChain.id === 97
      ? "https://testnet.bscscan.com"
      : "https://bscscan.com";
  return `${base}/address/${address}`;
}
