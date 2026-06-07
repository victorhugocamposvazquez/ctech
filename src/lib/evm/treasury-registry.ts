import type { SupabaseClient } from "@supabase/supabase-js";
import { privateKeyToAccount } from "viem/accounts";
import type { Address } from "viem";
import { isValidEvmAddress } from "./usdt-canonical";
import { getTreasuryPrivateKeyForNetwork, type EvmNetwork } from "./network";

export type TreasurySource = "env" | "panel" | "none";

export type TreasuryCredentials = {
  address: Address;
  privateKey: `0x${string}`;
  source: TreasurySource;
};

export type LabEvmTreasuryRow = {
  id: string;
  treasury_address: string;
  treasury_private_key: string;
  label: string | null;
  notes: string | null;
  configured_by: string | null;
  is_active: boolean;
  updated_at: string;
};

export function normalizePrivateKey(raw: string): `0x${string}` | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (!/^[a-fA-F0-9]{64}$/.test(hex)) return null;
  return `0x${hex}` as `0x${string}`;
}

export function getEnvTreasuryCredentials(): TreasuryCredentials | null {
  const raw = getTreasuryPrivateKeyForNetwork("bsc");
  if (!raw) return null;
  const privateKey = normalizePrivateKey(raw);
  if (!privateKey) return null;
  return {
    privateKey,
    address: privateKeyToAccount(privateKey).address,
    source: "env",
  };
}

export async function fetchActivePanelTreasury(
  admin: SupabaseClient
): Promise<LabEvmTreasuryRow | null> {
  const { data } = await admin
    .from("lab_evm_treasury")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  return (data as LabEvmTreasuryRow | null) ?? null;
}

export async function resolveTreasuryCredentials(
  admin: SupabaseClient
): Promise<TreasuryCredentials | null> {
  const fromEnv = getEnvTreasuryCredentials();
  if (fromEnv) return fromEnv;

  const row = await fetchActivePanelTreasury(admin);
  if (!row?.treasury_private_key) return null;

  const privateKey = normalizePrivateKey(row.treasury_private_key);
  if (!privateKey) return null;

  return {
    privateKey,
    address: privateKeyToAccount(privateKey).address,
    source: "panel",
  };
}

export async function isTreasuryReady(admin: SupabaseClient): Promise<boolean> {
  return Boolean(await resolveTreasuryCredentials(admin));
}

/** Sync: solo comprueba variable de entorno (legacy). */
export function isTreasuryEnvConfigured(_network?: EvmNetwork): boolean {
  return Boolean(getTreasuryPrivateKeyForNetwork("bsc"));
}

export function validateTreasuryInput(
  address: string,
  privateKey: string
): { ok: true } | { ok: false; error: string } {
  if (!isValidEvmAddress(address)) {
    return { ok: false, error: "Dirección treasury inválida (0x + 40 hex)" };
  }
  const pk = normalizePrivateKey(privateKey);
  if (!pk) {
    return { ok: false, error: "Private key inválida (64 caracteres hex)" };
  }
  const derived = privateKeyToAccount(pk).address.toLowerCase();
  if (derived !== address.trim().toLowerCase()) {
    return {
      ok: false,
      error: "La dirección no coincide con la private key. Revisa ambos campos.",
    };
  }
  return { ok: true };
}

export function maskPrivateKeyHint(privateKey: string): string {
  const pk = normalizePrivateKey(privateKey);
  if (!pk) return "••••";
  return `••••••••${pk.slice(-6)}`;
}
