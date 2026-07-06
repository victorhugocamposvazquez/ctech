import { NextResponse } from "next/server";
import { requireBackofficeAdmin } from "@/lib/backoffice/auth";
import { listSimulatedOperations } from "@/lib/wallet/simulated-credit";
import { isAddress } from "viem";

export async function GET(req: Request) {
  const { error, supabase } = await requireBackofficeAdmin();
  if (error || !supabase) {
    return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "40");
  const rawWallet = url.searchParams.get("wallet_address")?.trim();

  if (rawWallet && !isAddress(rawWallet)) {
    return NextResponse.json({ error: "Dirección inválida" }, { status: 400 });
  }

  try {
    const operations = await listSimulatedOperations(supabase, {
      limit: Number.isFinite(limit) ? limit : 40,
      walletAddress: rawWallet || undefined,
    });

    return NextResponse.json({ operations });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
