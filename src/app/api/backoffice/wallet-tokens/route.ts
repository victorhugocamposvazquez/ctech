import { NextResponse } from "next/server";
import { requireBackofficeAdmin } from "@/lib/backoffice/auth";
import { DEFAULT_MANAGED_TOKENS } from "@/lib/wallet/managed-tokens";
import { isAddress } from "viem";

export async function GET() {
  const { error, supabase } = await requireBackofficeAdmin();
  if (error || !supabase) return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });

  const { data, error: dbError } = await supabase
    .from("wallet_managed_tokens")
    .select("*")
    .order("sort_order", { ascending: true });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ tokens: data ?? [] });
}

export async function POST(req: Request) {
  const { error, supabase } = await requireBackofficeAdmin();
  if (error || !supabase) return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const symbol = String(body.symbol ?? "").trim().toUpperCase();
  const name = String(body.name ?? "").trim();
  const contractAddress = String(body.contract_address ?? "").trim();
  const network = String(body.network ?? "bsc").trim().toLowerCase();
  const decimals = Number(body.decimals ?? 18);
  const logoUrl = body.logo_url ? String(body.logo_url).trim() : null;
  const isActive = body.is_active !== false;
  const sortOrder = Number(body.sort_order ?? 0);

  if (!symbol || !name) {
    return NextResponse.json(
      { error: "symbol y name son obligatorios" },
      { status: 400 }
    );
  }

  if (!isAddress(contractAddress)) {
    return NextResponse.json(
      { error: "contract_address inválida" },
      { status: 400 }
    );
  }

  const { data, error: insertError } = await supabase
    .from("wallet_managed_tokens")
    .insert({
      symbol,
      name,
      contract_address: contractAddress,
      network,
      decimals,
      logo_url: logoUrl,
      is_active: isActive,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ token: data }, { status: 201 });
}

/** Restaura los 4 tokens por defecto si faltan (idempotente). */
export async function PUT() {
  const { error, supabase } = await requireBackofficeAdmin();
  if (error || !supabase) return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });

  const rows = DEFAULT_MANAGED_TOKENS.map((token) => ({
    symbol: token.symbol,
    name: token.name,
    contract_address: token.contract_address,
    network: token.network,
    decimals: token.decimals,
    logo_url: token.logo_url,
    is_active: token.is_active,
    sort_order: token.sort_order,
  }));

  const { error: upsertError } = await supabase
    .from("wallet_managed_tokens")
    .upsert(rows, { onConflict: "symbol,network", ignoreDuplicates: true });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const { data } = await supabase
    .from("wallet_managed_tokens")
    .select("*")
    .order("sort_order", { ascending: true });

  return NextResponse.json({ tokens: data ?? [] });
}
