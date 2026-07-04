import { NextResponse } from "next/server";
import { requireBackofficeAdmin } from "@/lib/backoffice/auth";
import { normalizeWalletAddress } from "@/lib/wallet/managed-tokens";
import { watchWalletTransfersForAddress } from "@/lib/wallet/transfer-watcher";
import { isAddress } from "viem";

export async function GET() {
  const { error, supabase } = await requireBackofficeAdmin();
  if (error || !supabase) {
    return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  const { data, error: dbError } = await supabase
    .from("wallet_registered_addresses")
    .select("id, wallet_address, label, last_scanned_block, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ wallets: data ?? [] });
}

export async function POST(req: Request) {
  const { error, supabase } = await requireBackofficeAdmin();
  if (error || !supabase) {
    return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const rawAddress = String(body.wallet_address ?? body.address ?? "").trim();
  const label = body.label ? String(body.label).trim() : null;

  if (!isAddress(rawAddress)) {
    return NextResponse.json({ error: "Dirección inválida" }, { status: 400 });
  }

  const walletAddress = normalizeWalletAddress(rawAddress);

  const { data, error: upsertError } = await supabase
    .from("wallet_registered_addresses")
    .upsert(
      { wallet_address: walletAddress, label },
      { onConflict: "wallet_address" }
    )
    .select("id, wallet_address, label, last_scanned_block, created_at, updated_at")
    .single();

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  try {
    await watchWalletTransfersForAddress(supabase, walletAddress);
  } catch (scanErr) {
    console.warn("[backoffice/wallet-addresses] scan failed:", scanErr);
  }

  return NextResponse.json({ wallet: data }, { status: 201 });
}
