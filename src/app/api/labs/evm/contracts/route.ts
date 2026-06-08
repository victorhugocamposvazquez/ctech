import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertInstructor } from "@/lib/labs/lab-guard";
import { EVM_NETWORK_META, type EvmNetwork } from "@/lib/evm/network";
import {
  fetchActiveLabContract,
  getEnvLabContractAddress,
  resolveLabContractAddress,
} from "@/lib/evm/contract-registry";
import { isTreasuryReady, resolveTreasuryCredentials } from "@/lib/evm/treasury-registry";
import { getExplorerContractUrl } from "@/lib/evm/chain-config";
import {
  getTreasuryNativeBalance,
  isExplorerVerificationAvailable,
} from "@/lib/evm/deploy-service";
import { getFlashUsdTLabArtifact } from "@/lib/evm/contract-artifact";

/** Solo redes del panel — evita 3× RPC y timeout en Vercel Hobby (~10s). */
const NETWORKS: EvmNetwork[] = ["bsc", "ethereum"];

async function withBalanceTimeout(
  network: EvmNetwork,
  address: Parameters<typeof getTreasuryNativeBalance>[1]
) {
  return Promise.race([
    getTreasuryNativeBalance(network, address),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 4_000)),
  ]);
}

/**
 * GET /api/labs/evm/contracts — estado de infra EVM por red (instructor).
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const authCheck = await assertInstructor(supabase, user.id, user.email);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const artifact = getFlashUsdTLabArtifact();
  const treasuryCreds = await resolveTreasuryCredentials(admin);
  const treasuryReadyGlobal = await isTreasuryReady(admin);

  const networks = await Promise.all(
    NETWORKS.map(async (id) => {
      const meta = EVM_NETWORK_META[id];
      const envContract = getEnvLabContractAddress(id);
      const dbContract = await fetchActiveLabContract(admin, id);
      const resolved = await resolveLabContractAddress(admin, id);

      let treasury: {
        address: string;
        balance: string;
        symbol: string;
        balanceUnavailable?: boolean;
      } | null = null;
      if (treasuryCreds?.address) {
        const bal = await withBalanceTimeout(id, treasuryCreds.address);
        treasury = bal
          ? { ...bal, address: bal.address }
          : {
              address: treasuryCreds.address,
              balance: "0",
              symbol: meta.nativeCurrency,
              balanceUnavailable: true,
            };
      }

      return {
        id,
        label: meta.label,
        shortLabel: meta.shortLabel,
        nativeCurrency: meta.nativeCurrency,
        treasuryReady: treasuryReadyGlobal,
        treasury,
        contract: {
          address: resolved,
          source: envContract ? "env" : dbContract ? "database" : null,
          envAddress: envContract ?? null,
          dbRecord: dbContract,
          explorerUrl: resolved ? getExplorerContractUrl(id, resolved) : null,
          onChain: null,
          operational: Boolean(treasuryReadyGlobal && resolved),
        },
        verification: {
          available: isExplorerVerificationAvailable(),
          status: dbContract?.verification_status ?? (resolved ? "unverified" : null),
          guid: dbContract?.verification_guid ?? null,
          verifiedAt: dbContract?.verified_at ?? null,
          error: dbContract?.verification_error ?? null,
        },
      };
    })
  );

  return NextResponse.json({
    artifact: {
      contractName: artifact.contractName,
      compilerVersion: artifact.compilerVersion,
      optimizationRuns: artifact.optimizationRuns,
    },
    explorerApiConfigured: isExplorerVerificationAvailable(),
    treasuryEnvConfigured: Boolean(process.env.EVM_LAB_TREASURY_PRIVATE_KEY),
    treasuryPanelConfigured: treasuryCreds?.source === "panel",
    treasuryActiveSource: treasuryCreds?.source ?? "none",
    networks,
  });
}
