import type { SupabaseClient } from "@supabase/supabase-js";
import type { Address } from "viem";
import type { EvmLabOptions } from "./flash-usdt-lab";
import { resolveLabContractAddress } from "./contract-registry";
import { resolveTreasuryCredentials } from "./treasury-registry";
import type { EvmNetwork } from "./network";

export async function resolveEvmLabContext(
  admin: SupabaseClient,
  network: EvmNetwork
): Promise<{
  labContractAddress: Address | null;
  evmOptions: EvmLabOptions;
}> {
  const [labContractAddress, treasury] = await Promise.all([
    resolveLabContractAddress(admin, network),
    resolveTreasuryCredentials(admin),
  ]);

  return {
    labContractAddress,
    evmOptions: {
      labContractAddress: labContractAddress ?? undefined,
      treasuryPrivateKey: treasury?.privateKey,
    },
  };
}
