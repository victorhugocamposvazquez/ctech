import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWalletAddress } from "@/lib/wallet/managed-tokens";
import { isAddress } from "viem";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawAddress = url.searchParams.get("address")?.trim() ?? "";

  if (!isAddress(rawAddress)) {
    return NextResponse.json({ error: "Dirección inválida" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const walletAddress = normalizeWalletAddress(rawAddress);

    const { data, error } = await supabase
      .from("wallet_registered_addresses")
      .select("id, label")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      registered: !!data,
      label: data?.label ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
