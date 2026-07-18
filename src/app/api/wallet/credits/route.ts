import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWalletAddress } from "@/lib/wallet/managed-tokens";
import { getSimulatedBalances } from "@/lib/wallet/simulated-credit";
import { isAddress } from "viem";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawAddress = url.searchParams.get("address")?.trim() ?? "";

  if (!isAddress(rawAddress)) {
    return NextResponse.json({ error: "Dirección inválida" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { byTokenId, byContract } = await getSimulatedBalances(
      supabase,
      normalizeWalletAddress(rawAddress)
    );

    return NextResponse.json({
      balances: byTokenId,
      balancesByContract: byContract,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
