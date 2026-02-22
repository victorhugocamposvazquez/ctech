import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TradeSide = "buy" | "sell";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const symbol = String(body.symbol ?? "").trim().toUpperCase();
  const side = String(body.side ?? "").trim() as TradeSide;
  const quantity = Number(body.quantity ?? 0);
  const entryPrice =
    body.entryPrice == null || body.entryPrice === ""
      ? null
      : Number(body.entryPrice);
  const signalId =
    body.signalId == null || body.signalId === "" ? null : String(body.signalId);
  const exchangeConnectionId =
    body.exchangeConnectionId == null || body.exchangeConnectionId === ""
      ? null
      : String(body.exchangeConnectionId);
  const metadata = body.metadata ?? {};

  if (!symbol || quantity <= 0) {
    return NextResponse.json(
      { error: "symbol y quantity (> 0) son obligatorios" },
      { status: 400 }
    );
  }

  if (!["buy", "sell"].includes(side)) {
    return NextResponse.json(
      { error: "side debe ser buy o sell" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("trades")
    .insert({
      user_id: user.id,
      signal_id: signalId,
      exchange_connection_id: exchangeConnectionId,
      symbol,
      side,
      quantity,
      entry_price: entryPrice,
      status: "open",
      metadata: {
        executionMode: "manual",
        ...metadata,
      },
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
