import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET  /api/wallets — lista wallets tracked del usuario.
 * POST /api/wallets — añade una wallet al tracking.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("tracked_wallets")
    .select(
      `id, address, network, label, category, source, is_active, notes,
       created_at, updated_at,
       wallet_scores (overall_score, win_rate, profit_factor, calculated_at)`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const address = String(body.address ?? "").trim().toLowerCase();
  const network = String(body.network ?? "ethereum").trim().toLowerCase();
  const label = body.label ? String(body.label).trim() : null;
  const category = body.category ?? "unknown";
  const source = body.source ?? "manual";
  const notes = body.notes ? String(body.notes).trim() : null;

  if (!address) {
    return NextResponse.json(
      { error: "address es obligatorio" },
      { status: 400 }
    );
  }

  const validCategories = ["alpha", "momentum", "early", "lp_arb", "swing", "unknown"];
  if (!validCategories.includes(category)) {
    return NextResponse.json(
      { error: `category debe ser uno de: ${validCategories.join(", ")}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("tracked_wallets")
    .upsert(
      {
        user_id: user.id,
        address,
        network,
        label,
        category,
        source,
        notes,
        is_active: true,
      },
      { onConflict: "user_id,address,network" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
