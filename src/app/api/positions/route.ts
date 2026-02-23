import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/positions — posiciones abiertas del usuario.
 * GET /api/positions?status=closed — historial de cerradas.
 * GET /api/positions?status=all — todas.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "open";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  let query = supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .eq("execution_mode", "paper")
    .order("opened_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    count: data?.length ?? 0,
    positions: data,
  });
}
