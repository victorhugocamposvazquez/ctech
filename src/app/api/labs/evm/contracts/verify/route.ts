import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertInstructor, logLabAudit, getClientIp } from "@/lib/labs/lab-guard";
import { parseEvmNetwork } from "@/lib/evm/network";
import {
  fetchActiveLabContract,
  resolveLabContractAddress,
} from "@/lib/evm/contract-registry";
import {
  checkContractVerificationStatus,
  isExplorerVerificationAvailable,
  submitContractVerification,
} from "@/lib/evm/deploy-service";

/**
 * POST /api/labs/evm/contracts/verify
 * body: { network, action?: "submit" | "check" }
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

  if (!isExplorerVerificationAvailable()) {
    return NextResponse.json(
      {
        error:
          "Falta EVM_EXPLORER_API_KEY (Etherscan API v2 — funciona para BSC, Ethereum y Polygon)",
      },
      { status: 503 }
    );
  }

  const body = await req.json();
  const network = parseEvmNetwork(body.network);
  const action = body.action === "check" ? "check" : "submit";

  if (!network) {
    return NextResponse.json({ error: "network inválida" }, { status: 400 });
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

  const contractAddress = await resolveLabContractAddress(admin, network);
  if (!contractAddress) {
    return NextResponse.json({ error: "No hay contrato desplegado en esta red" }, { status: 404 });
  }

  const dbContract = await fetchActiveLabContract(admin, network);

  if (action === "check") {
    const guid = body.guid ?? dbContract?.verification_guid;
    if (!guid) {
      return NextResponse.json({ error: "No hay verificación pendiente (guid)" }, { status: 400 });
    }

    const status = await checkContractVerificationStatus(network, guid);
    const updates: Record<string, unknown> = {
      verification_status: status.status,
      verification_error: status.error ?? null,
    };
    if (status.status === "verified") {
      updates.verified_at = new Date().toISOString();
    }

    if (dbContract) {
      await admin.from("lab_evm_contracts").update(updates).eq("id", dbContract.id);
    }

    return NextResponse.json({ network, guid, ...status });
  }

  const submitted = await submitContractVerification(network, contractAddress);
  if (!submitted.success || !submitted.guid) {
    return NextResponse.json({ error: submitted.error ?? "Verificación fallida" }, { status: 500 });
  }

  if (dbContract) {
    await admin
      .from("lab_evm_contracts")
      .update({
        verification_status: "pending",
        verification_guid: submitted.guid,
        verification_error: null,
      })
      .eq("id", dbContract.id);
  }

  await logLabAudit(supabase, {
    userId: user.id,
    action: "evm_contract_verify_submitted",
    metadata: { network, contractAddress, guid: submitted.guid },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({
    success: true,
    network,
    contractAddress,
    guid: submitted.guid,
    message: "Verificación enviada. Comprueba el estado en ~30 segundos.",
  });
}
