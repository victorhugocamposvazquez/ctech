import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function startOfTodayIso() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const todayIso = startOfTodayIso();

  const [signalsResult, tradesResult, pnlResult] = await Promise.all([
    supabase
      .from("signals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("generated_at", todayIso),
    supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("opened_at", todayIso),
    supabase
      .from("trades")
      .select("pnl_abs")
      .eq("user_id", user.id)
      .not("pnl_abs", "is", null),
  ]);

  if (signalsResult.error || tradesResult.error || pnlResult.error) {
    return NextResponse.json(
      {
        error:
          signalsResult.error?.message ||
          tradesResult.error?.message ||
          pnlResult.error?.message ||
          "Error obteniendo KPIs",
      },
      { status: 500 }
    );
  }

  const pnlTotal =
    pnlResult.data?.reduce((acc, row) => acc + Number(row.pnl_abs ?? 0), 0) ?? 0;

  return NextResponse.json({
    signalsToday: signalsResult.count ?? 0,
    tradesToday: tradesResult.count ?? 0,
    pnlTotal,
  });
}
