import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertInstructor } from "@/lib/labs/lab-guard";
import { parseEvmNetwork } from "@/lib/evm/network";
import { confirmPricePoolTx } from "@/lib/evm/price-pool-service";
import type { Hash } from "viem";

export const maxDuration = 10;

/**
 * POST /api/labs/evm/contracts/price-pool/confirm — espera receipt de un paso del pool.
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
  const txHash = String(body.txHash ?? "").trim() as Hash;

  if (!network) {
    return NextResponse.json({ error: "network inválida" }, { status: 400 });
  }
  if (!txHash.startsWith("0x")) {
    return NextResponse.json({ error: "txHash inválido" }, { status: 400 });
  }

  const result = await confirmPricePoolTx(network, txHash);

  if (result.pending) {
    return NextResponse.json(
      {
        pending: true,
        txHash,
        txExplorerUrl: result.txExplorerUrl,
        message: "Transacción pendiente. Reintenta en unos segundos.",
      },
      { status: 202 }
    );
  }

  if (result.failed || !result.confirmed) {
    return NextResponse.json(
      { error: "La transacción falló o fue revertida", txHash, txExplorerUrl: result.txExplorerUrl },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    confirmed: true,
    txHash,
    txExplorerUrl: result.txExplorerUrl,
  });
}
