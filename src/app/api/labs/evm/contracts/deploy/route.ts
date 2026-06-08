import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertInstructor } from "@/lib/labs/lab-guard";
import { parseEvmNetwork } from "@/lib/evm/network";
import {
  fetchActiveLabContract,
  getEnvLabContractAddress,
} from "@/lib/evm/contract-registry";
import { startFlashUsdTLabDeploy } from "@/lib/evm/deploy-service";
import { isTreasuryReady, resolveTreasuryCredentials } from "@/lib/evm/treasury-registry";

export const maxDuration = 10;

/**
 * POST /api/labs/evm/contracts/deploy — envía tx de deploy (confirmar con /confirm).
 */
export async function POST(req: Request) {
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

  const body = await req.json();
  const network = parseEvmNetwork(body.network);
  const force = Boolean(body.force);
  const tokenMeta = {
    name: typeof body.tokenName === "string" ? body.tokenName : null,
    symbol: typeof body.tokenSymbol === "string" ? body.tokenSymbol : null,
  };

  if (!network) {
    return NextResponse.json({ error: "network inválida (bsc | ethereum | polygon)" }, { status: 400 });
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

  if (!(await isTreasuryReady(admin))) {
    return NextResponse.json(
      { error: "Configura la treasury en el panel o EVM_LAB_TREASURY_PRIVATE_KEY" },
      { status: 503 }
    );
  }

  const treasury = await resolveTreasuryCredentials(admin);

  if (getEnvLabContractAddress(network) && !force) {
    return NextResponse.json(
      {
        error:
          "Ya hay contrato en variables de entorno para esta red. Usa force:true para desplegar otro.",
      },
      { status: 409 }
    );
  }

  const existing = await fetchActiveLabContract(admin, network);
  if (existing && !force) {
    return NextResponse.json(
      {
        error: "Ya existe un contrato activo en BD para esta red. Usa force:true para redeploy.",
        contractAddress: existing.contract_address,
      },
      { status: 409 }
    );
  }

  const result = await startFlashUsdTLabDeploy(network, treasury?.privateKey, tokenMeta);
  if (!result.success || !result.txHash) {
    return NextResponse.json(
      { error: result.error ?? "Deploy fallido" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    pending: true,
    network,
    txHash: result.txHash,
    txExplorerUrl: result.txExplorerUrl,
    tokenMeta: result.tokenMeta,
    message: "Transacción enviada. Confirmando en la red…",
    hint: "Si cierras la página, usa «Registrar contrato» con la dirección de BscScan.",
  });
}
