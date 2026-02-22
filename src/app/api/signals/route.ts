import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SignalDirection = "buy" | "sell" | "hold";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const strategyName = String(body.strategyName ?? "").trim();
  const symbol = String(body.symbol ?? "").trim().toUpperCase();
  const timeframe = String(body.timeframe ?? "1m").trim();
  const direction = String(body.direction ?? "").trim() as SignalDirection;
  const score = body.score == null ? null : Number(body.score);
  const source = body.source == null ? null : String(body.source).trim();
  const metadata = body.metadata ?? {};

  if (!strategyName || !symbol) {
    return NextResponse.json(
      { error: "strategyName y symbol son obligatorios" },
      { status: 400 }
    );
  }

  if (!["buy", "sell", "hold"].includes(direction)) {
    return NextResponse.json(
      { error: "direction debe ser buy, sell o hold" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("signals")
    .insert({
      user_id: user.id,
      strategy_name: strategyName,
      symbol,
      timeframe,
      direction,
      score,
      source,
      metadata,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
