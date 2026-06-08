import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertInstructor } from "@/lib/labs/lab-guard";
import { parseEvmNetwork } from "@/lib/evm/network";
import { resolveLabContractAddress } from "@/lib/evm/contract-registry";
import {
  getPricePoolStatus,
  PRICE_POOL_WALLET_COMPAT,
} from "@/lib/evm/liquidity-pool";

export const maxDuration = 10;

/**
 * GET /api/labs/evm/contracts/price-pool?network=bsc
 * Estado del pool fUSDT/USDT en PancakeSwap (solo lectura).
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

  const url = new URL(req.url);
  const network = parseEvmNetwork(url.searchParams.get("network") ?? "bsc");
  if (!network) {
    return NextResponse.json({ error: "network inválida (bsc)" }, { status: 400 });
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
  if (!contractAddress || !isAddress(contractAddress)) {
    return NextResponse.json(
      { error: "No hay contrato lab desplegado en esta red", supported: false, exists: false },
      { status: 404 }
    );
  }

  const pool = await getPricePoolStatus(network, contractAddress);
  return NextResponse.json({
    network,
    contractAddress,
    pool,
    walletCompat: PRICE_POOL_WALLET_COMPAT,
    createPoolHint:
      "node scripts/create-price-pool.mjs --usdt 10 --price 1 (requiere USDT real en treasury)",
  });
}
