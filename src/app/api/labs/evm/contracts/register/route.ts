import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertInstructor, logLabAudit, getClientIp } from "@/lib/labs/lab-guard";
import { parseEvmNetwork } from "@/lib/evm/network";
import { fetchActiveLabContract } from "@/lib/evm/contract-registry";
import { readOnChainContractMeta } from "@/lib/evm/deploy-service";
import { getFlashUsdTLabArtifact } from "@/lib/evm/contract-artifact";
import { isValidEvmAddress } from "@/lib/evm/usdt-canonical";
import type { Address } from "viem";

/**
 * POST /api/labs/evm/contracts/register — registra manualmente un contrato ya desplegado.
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
  const contractAddress = String(body.contractAddress ?? "").trim();
  const deployTxHash = body.deployTxHash ? String(body.deployTxHash).trim() : null;
  const force = Boolean(body.force);

  if (!network) {
    return NextResponse.json({ error: "network inválida" }, { status: 400 });
  }
  if (!isValidEvmAddress(contractAddress)) {
    return NextResponse.json({ error: "contractAddress inválida" }, { status: 400 });
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

  const onChain = await readOnChainContractMeta(network, contractAddress as Address);
  if (!onChain) {
    return NextResponse.json(
      { error: "No se encontró contrato FlashUSDTLab en esa dirección (revisa red y address)" },
      { status: 400 }
    );
  }

  const existing = await fetchActiveLabContract(admin, network);
  if (existing && !force) {
    return NextResponse.json(
      {
        error: "Ya hay contrato activo. Usa force:true para reemplazar.",
        contractAddress: existing.contract_address,
      },
      { status: 409 }
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
      contract_address: contractAddress,
      deploy_tx_hash: deployTxHash ?? `manual-${Date.now()}`,
      deployed_by: user.id,
      verification_status: "unverified",
      compiler_version: artifact.compilerVersion,
      metadata: { optimizationRuns: artifact.optimizationRuns, registeredManually: true },
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await logLabAudit(supabase, {
    userId: user.id,
    action: "evm_contract_registered_manual",
    metadata: { network, contractAddress },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({
    success: true,
    network,
    contractAddress,
    onChain,
    dbRecord: row,
  });
}
