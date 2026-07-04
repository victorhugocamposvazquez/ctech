import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWalletAddress } from "@/lib/wallet/managed-tokens";
import { isAddress } from "viem";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawAddress = String(body.address ?? "").trim();

  if (!isAddress(rawAddress)) {
    return NextResponse.json({ error: "Dirección inválida" }, { status: 400 });
  }

  const walletAddress = normalizeWalletAddress(rawAddress);
  const label = body.label ? String(body.label).trim() : null;

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("wallet_registered_addresses")
      .upsert(
        {
          wallet_address: walletAddress,
          label,
        },
        { onConflict: "wallet_address" }
      )
      .select("id, wallet_address, label, last_scanned_block, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ wallet: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
