import { formatUnits } from "viem";

export function formatTokenAmount(
  raw: bigint,
  decimals: number,
  maxFraction = 6
): string {
  const n = Number(formatUnits(raw, decimals));
  if (n === 0) return "0";
  if (n < 0.000001) return "<0.000001";

  return n.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFraction,
  });
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "$0,00";

  return value.toLocaleString("es-ES", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}
