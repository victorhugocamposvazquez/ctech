import { NextResponse } from "next/server";
import { requireBackofficeAdmin } from "@/lib/backoffice/auth";
import { normalizeWalletAddress } from "@/lib/wallet/managed-tokens";
import { isAddress } from "viem";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireBackofficeAdmin();
  if (error || !supabase) {
    return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const updates: { label?: string | null; wallet_address?: string } = {};

  if (body.label !== undefined) {
    updates.label = body.label ? String(body.label).trim() || null : null;
  }

  if (body.wallet_address !== undefined || body.address !== undefined) {
    const rawAddress = String(body.wallet_address ?? body.address ?? "").trim();
    if (!isAddress(rawAddress)) {
      return NextResponse.json({ error: "Dirección inválida" }, { status: 400 });
    }
    updates.wallet_address = normalizeWalletAddress(rawAddress);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("wallet_registered_addresses")
    .update(updates)
    .eq("id", id)
    .select("id, wallet_address, label, last_scanned_block, created_at, updated_at")
    .single();

  if (dbError) {
    const status = dbError.code === "23505" ? 409 : 500;
    const message =
      dbError.code === "23505"
        ? "Esa dirección ya está registrada"
        : dbError.message;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ wallet: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireBackofficeAdmin();
  if (error || !supabase) {
    return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  const { id } = await params;

  const { error: dbError } = await supabase
    .from("wallet_registered_addresses")
    .delete()
    .eq("id", id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
