import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertInstructor, logLabAudit, getClientIp } from "@/lib/labs/lab-guard";
import { parseEvmNetwork } from "@/lib/evm/network";
import { fetchActiveLabContract } from "@/lib/evm/contract-registry";
import { confirmFlashUsdTLabDeploy } from "@/lib/evm/deploy-service";
import { getFlashUsdTLabArtifact } from "@/lib/evm/contract-artifact";
import type { Hash } from "viem";

export const maxDuration = 10;

/**
 * POST /api/labs/evm/contracts/confirm — espera receipt de un deploy y guarda en BD.
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
  const txHash = String(body.txHash ?? "").trim() as Hash;
  const force = Boolean(body.force);

  if (!network) {
    return NextResponse.json({ error: "network inválida" }, { status: 400 });
  }
  if (!txHash.startsWith("0x")) {
    return NextResponse.json({ error: "txHash inválido" }, { status: 400 });
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

  const existing = await fetchActiveLabContract(admin, network);
  if (existing && !force) {
    return NextResponse.json(
      {
        error: "Ya hay contrato activo en BD. Usa force:true o regístralo manualmente.",
        contractAddress: existing.contract_address,
      },
      { status: 409 }
    );
  }

  const result = await confirmFlashUsdTLabDeploy(network, txHash);

  if (result.pending) {
    return NextResponse.json(
      {
        pending: true,
        txHash,
        txExplorerUrl: result.txExplorerUrl,
        message: "La transacción sigue pendiente. Vuelve a intentar en unos segundos.",
      },
      { status: 202 }
    );
  }

  if (!result.success || !result.contractAddress) {
    return NextResponse.json(
      { error: result.error ?? "No se pudo confirmar el deploy", txHash },
      { status: 500 }
    );
  }

  if (existing) {
    await admin.from("lab_evm_contracts").update({ is_active: false }).eq("id", existing.id);
  }

  const artifact = getFlashUsdTLabArtifact();
  const { data: row, error: insertError } = await admin
    .from("lab_evm_contracts")
    .insert({
      network,
      contract_address: result.contractAddress,
      deploy_tx_hash: txHash,
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
        error: `Deploy confirmado pero fallo al guardar en BD: ${insertError.message}`,
        contractAddress: result.contractAddress,
        txHash,
        explorerUrl: result.explorerUrl,
      },
      { status: 500 }
    );
  }

  await logLabAudit(supabase, {
    userId: user.id,
    action: "evm_contract_deployed",
    metadata: { network, contractAddress: result.contractAddress, txHash },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({
    success: true,
    network,
    contractAddress: result.contractAddress,
    txHash,
    explorerUrl: result.explorerUrl,
    txExplorerUrl: result.txExplorerUrl,
    dbRecord: row,
  });
}
