import { formatUnits } from "viem";

/** Formato español completo: 2.000.000,00 $ (sin abreviar a 2M). */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0,00 $";

  const sign = value < 0 ? "-" : "";
  const formatted = Math.abs(value).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  });

  return `${sign}${formatted} $`;
}

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
    useGrouping: true,
  });
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}
