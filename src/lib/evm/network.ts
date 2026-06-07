export type EvmNetwork = "bsc" | "polygon" | "ethereum";

const ALL_NETWORKS: EvmNetwork[] = ["bsc", "ethereum", "polygon"];

const ENV_SUFFIX: Record<EvmNetwork, string> = {
  bsc: "BSC",
  ethereum: "ETHEREUM",
  polygon: "POLYGON",
};

export const EVM_NETWORK_META: Record<
  EvmNetwork,
  { label: string; shortLabel: string; nativeCurrency: string }
> = {
  bsc: { label: "BNB Smart Chain (BSC)", shortLabel: "BSC", nativeCurrency: "BNB" },
  ethereum: { label: "Ethereum", shortLabel: "ETH", nativeCurrency: "ETH" },
  polygon: { label: "Polygon", shortLabel: "POL", nativeCurrency: "MATIC" },
};

export function parseEvmNetwork(value: string | null | undefined): EvmNetwork | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "bsc" || raw === "ethereum" || raw === "polygon") return raw;
  return null;
}

/** Red por defecto (legacy `EVM_NETWORK` o BSC). */
export function getDefaultEvmNetwork(): EvmNetwork {
  return parseEvmNetwork(process.env.EVM_NETWORK) ?? "bsc";
}

/** Alias retrocompatible. */
export function getEvmNetwork(): EvmNetwork {
  return getDefaultEvmNetwork();
}

export function getEvmNetworkLabel(network: EvmNetwork): string {
  return EVM_NETWORK_META[network].label;
}

function getNetworkEnvVar(network: EvmNetwork, suffix: string): string | undefined {
  const key = ENV_SUFFIX[network];
  const specific = process.env[`EVM_${key}_${suffix}`];
  if (specific) return specific;

  if (network === getDefaultEvmNetwork()) {
    if (suffix === "FLASH_USDT_LAB_CONTRACT") {
      return process.env.EVM_FLASH_USDT_LAB_CONTRACT;
    }
    if (suffix === "RPC_URL") {
      return process.env.EVM_RPC_URL;
    }
  }

  return undefined;
}

export function getLabContractAddressForNetwork(network: EvmNetwork): string | undefined {
  return getNetworkEnvVar(network, "FLASH_USDT_LAB_CONTRACT");
}

export function getRpcUrlForNetwork(network: EvmNetwork): string | undefined {
  return getNetworkEnvVar(network, "RPC_URL");
}

export function getTreasuryPrivateKeyForNetwork(network: EvmNetwork): string | undefined {
  const key = ENV_SUFFIX[network];
  const specific = process.env[`EVM_${key}_TREASURY_PRIVATE_KEY`];
  if (specific) return specific;
  return process.env.EVM_LAB_TREASURY_PRIVATE_KEY;
}

export function isEvmNetworkConfigured(network: EvmNetwork): boolean {
  return Boolean(
    getLabContractAddressForNetwork(network) && getTreasuryPrivateKeyForNetwork(network)
  );
}

export function getEnabledEvmNetworks(): EvmNetwork[] {
  return ALL_NETWORKS.filter(isEvmNetworkConfigured);
}

export function isAnyEvmNetworkConfigured(): boolean {
  return getEnabledEvmNetworks().length > 0;
}

export function assertEvmNetworkConfigured(network: EvmNetwork): void {
  if (!isEvmNetworkConfigured(network)) {
    throw new Error(
      `Red ${getEvmNetworkLabel(network)} no configurada. Define EVM_${ENV_SUFFIX[network]}_FLASH_USDT_LAB_CONTRACT y treasury.`
    );
  }
}
