import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertInstructor, logLabAudit, getClientIp } from "@/lib/labs/lab-guard";
import { parseEvmNetwork, type EvmNetwork } from "@/lib/evm/network";
import {
  fetchActiveLabContract,
  getEnvLabContractAddress,
} from "@/lib/evm/contract-registry";
import { deployFlashUsdTLab } from "@/lib/evm/deploy-service";
import { getFlashUsdTLabArtifact } from "@/lib/evm/contract-artifact";
import { isTreasuryReady, resolveTreasuryCredentials } from "@/lib/evm/treasury-registry";

/**
 * POST /api/labs/evm/contracts/deploy — despliega FlashUSDTLab en la red indicada.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const authCheck = await assertInstructor(supabase, user.id);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const body = await req.json();
  const network = parseEvmNetwork(body.network);
  const force = Boolean(body.force);

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
          "Ya hay contrato en variables de entorno para esta red. Usa force:true para desplegar otro (se guardará en BD).",
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

  const result = await deployFlashUsdTLab(network, treasury?.privateKey);
  if (!result.success || !result.contractAddress || !result.txHash) {
    return NextResponse.json(
      { error: result.error ?? "Deploy fallido", txHash: result.txHash },
      { status: 500 }
    );
  }

  if (existing) {
    await admin
      .from("lab_evm_contracts")
      .update({ is_active: false })
      .eq("id", existing.id);
  }

  const artifact = getFlashUsdTLabArtifact();
  const { data: row, error: insertError } = await admin
    .from("lab_evm_contracts")
    .insert({
      network,
      contract_address: result.contractAddress,
      deploy_tx_hash: result.txHash,
      deployed_by: user.id,
      verification_status: "unverified",
      compiler_version: artifact.compilerVersion,
      metadata: { optimizationRuns: artifact.optimizationRuns },
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json(
      {
        error: `Deploy OK pero fallo al guardar en BD: ${insertError.message}`,
        contractAddress: result.contractAddress,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
      },
      { status: 500 }
    );
  }

  await logLabAudit(supabase, {
    userId: user.id,
    action: "evm_contract_deployed",
    metadata: { network, contractAddress: result.contractAddress, txHash: result.txHash },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({
    success: true,
    network,
    contractAddress: result.contractAddress,
    txHash: result.txHash,
    explorerUrl: result.explorerUrl,
    txExplorerUrl: result.txExplorerUrl,
    dbRecord: row,
    hint: getEnvLabContractAddress(network)
      ? "Contrato en env tiene prioridad. Opcional: copia la dirección a EVM_{RED}_FLASH_USDT_LAB_CONTRACT."
      : "Contrato listo. Las inyecciones lo usarán automáticamente desde BD.",
  });
}
