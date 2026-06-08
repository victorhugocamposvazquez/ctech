import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertInstructor, logLabAudit, getClientIp } from "@/lib/labs/lab-guard";
import { parseEvmNetwork } from "@/lib/evm/network";
import { resolveLabContractAddress } from "@/lib/evm/contract-registry";
import { isTreasuryReady, resolveTreasuryCredentials } from "@/lib/evm/treasury-registry";
import {
  executePricePoolStep,
  type PoolCreateAfterStep,
} from "@/lib/evm/price-pool-service";

export const maxDuration = 10;

const VALID_AFTER: PoolCreateAfterStep[] = ["start", "mint", "approve_lab", "approve_usdt"];

/**
 * POST /api/labs/evm/contracts/price-pool/step
 * Envía UNA transacción del flujo de creación de pool (evita timeout en Vercel).
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
  const network = parseEvmNetwork(body.network ?? "bsc");
  const afterStep = (body.afterStep ?? "start") as PoolCreateAfterStep;
  const usdtAmount = Number(body.usdtAmount ?? 10);
  const price = Number(body.price ?? 1);

  if (!network) {
    return NextResponse.json({ error: "network inválida (bsc)" }, { status: 400 });
  }
  if (!VALID_AFTER.includes(afterStep)) {
    return NextResponse.json({ error: "afterStep inválido" }, { status: 400 });
  }
  if (!Number.isFinite(usdtAmount) || usdtAmount <= 0 || usdtAmount > 10_000) {
    return NextResponse.json({ error: "usdtAmount debe estar entre 1 y 10000" }, { status: 400 });
  }
  if (!Number.isFinite(price) || price <= 0 || price > 1000) {
    return NextResponse.json({ error: "price inválido" }, { status: 400 });
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
  if (!treasury?.privateKey) {
    return NextResponse.json({ error: "Treasury sin clave privada" }, { status: 503 });
  }

  const contractAddress = await resolveLabContractAddress(admin, network);
  if (!contractAddress || !isAddress(contractAddress)) {
    return NextResponse.json({ error: "No hay contrato lab en esta red" }, { status: 404 });
  }

  const result = await executePricePoolStep({
    network,
    labContractAddress: contractAddress,
    treasuryPrivateKey: treasury.privateKey,
    usdtAmount,
    price,
    afterStep,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Paso fallido" }, { status: 500 });
  }

  if (result.txHash) {
    await logLabAudit(supabase, {
      userId: user.id,
      action: "evm_price_pool_step",
      metadata: {
        network,
        step: result.step,
        txHash: result.txHash,
        usdtAmount,
        price,
      },
      ipAddress: getClientIp(req),
    });
  }

  return NextResponse.json({
    ...result,
    pending: Boolean(result.txHash),
    network,
    contractAddress,
    usdtAmount,
    price,
    fusdtAmount: usdtAmount / price,
  });
}
