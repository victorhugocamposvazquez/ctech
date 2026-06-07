import type { SupabaseClient } from "@supabase/supabase-js";
import type { Address } from "viem";
import {
  getLabContractAddressForNetwork,
  type EvmNetwork,
} from "./network";
import { isTreasuryEnvConfigured } from "./treasury-registry";

export type LabEvmContractRow = {
  id: string;
  network: string;
  contract_address: string;
  deploy_tx_hash: string;
  deployed_at: string;
  verification_status: string;
  verification_guid: string | null;
  verified_at: string | null;
  verification_error: string | null;
  is_active: boolean;
  compiler_version: string | null;
};

export function isTreasuryConfigured(_network?: EvmNetwork): boolean {
  return isTreasuryEnvConfigured();
}

export function getEnvLabContractAddress(network: EvmNetwork): string | undefined {
  return getLabContractAddressForNetwork(network);
}

export async function fetchActiveLabContract(
  admin: SupabaseClient,
  network: EvmNetwork
): Promise<LabEvmContractRow | null> {
  const { data } = await admin
    .from("lab_evm_contracts")
    .select("*")
    .eq("network", network)
    .eq("is_active", true)
    .maybeSingle();

  return (data as LabEvmContractRow | null) ?? null;
}

export async function resolveLabContractAddress(
  admin: SupabaseClient,
  network: EvmNetwork
): Promise<Address | null> {
  const fromEnv = getLabContractAddressForNetwork(network);
  if (fromEnv) return fromEnv as Address;

  const row = await fetchActiveLabContract(admin, network);
  return row?.contract_address ? (row.contract_address as Address) : null;
}

export async function isNetworkOperational(
  admin: SupabaseClient,
  network: EvmNetwork
): Promise<boolean> {
  const { resolveTreasuryCredentials } = await import("./treasury-registry");
  if (!(await resolveTreasuryCredentials(admin))) return false;
  const address = await resolveLabContractAddress(admin, network);
  return Boolean(address);
}
