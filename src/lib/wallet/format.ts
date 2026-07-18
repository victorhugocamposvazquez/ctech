import { formatUnits } from "viem";

/** Formato español manual (evita abreviaturas tipo 11M en iOS/Safari). */
function formatEsDecimal(value: number, fractionDigits: number): string {
  const negative = value < 0;
  const abs = Math.abs(value);
  const [intPart, fracPart] = abs.toFixed(fractionDigits).split(".");
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${groupedInt},${fracPart}`;
}

/** $2.000.000,00 */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "$0,00";
  const formatted = formatEsDecimal(value, 2);
  return value < 0 ? `-$${formatted.slice(1)}` : `$${formatted}`;
}

export function formatTokenAmount(
  raw: bigint,
  decimals: number,
  maxFraction = 6
): string {
  const n = Number(formatUnits(raw, decimals));
  if (n === 0) return "0";
  if (n < 0.000001) return "<0.000001";

  const [intPart, fracPart] = n.toFixed(maxFraction).split(".");
  const trimmedFrac = fracPart.replace(/0+$/, "");
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return trimmedFrac ? `${groupedInt},${trimmedFrac}` : groupedInt;
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}
