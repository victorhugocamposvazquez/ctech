export type EvmNetwork = "bsc" | "polygon" | "ethereum";

export function getEvmNetwork(): EvmNetwork {
  const raw = (process.env.EVM_NETWORK ?? "bsc").toLowerCase();
  if (raw === "polygon" || raw === "ethereum") return raw;
  return "bsc";
}
