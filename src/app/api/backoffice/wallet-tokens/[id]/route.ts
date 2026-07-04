import { NextResponse } from "next/server";
import { requireBackofficeAdmin } from "@/lib/backoffice/auth";
import { isAddress } from "viem";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const { error, supabase } = await requireBackofficeAdmin();
  if (error || !supabase) return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  const updates: Record<string, unknown> = {};

  if (body.symbol != null) updates.symbol = String(body.symbol).trim().toUpperCase();
  if (body.name != null) updates.name = String(body.name).trim();
  if (body.contract_address != null) {
    const addr = String(body.contract_address).trim();
    if (!isAddress(addr)) {
      return NextResponse.json({ error: "contract_address inválida" }, { status: 400 });
    }
    updates.contract_address = addr;
  }
  if (body.network != null) updates.network = String(body.network).trim().toLowerCase();
  if (body.decimals != null) updates.decimals = Number(body.decimals);
  if (body.logo_url != null) updates.logo_url = String(body.logo_url).trim() || null;
  if (body.is_active != null) updates.is_active = Boolean(body.is_active);
  if (body.sort_order != null) updates.sort_order = Number(body.sort_order);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  }

  const { data, error: updateError } = await supabase
    .from("wallet_managed_tokens")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Token no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ token: data });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error, supabase } = await requireBackofficeAdmin();
  if (error || !supabase) return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });

  const { id } = await context.params;

  const { error: deleteError } = await supabase
    .from("wallet_managed_tokens")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
