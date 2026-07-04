import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWalletAddress } from "@/lib/wallet/managed-tokens";
import { isAddress } from "viem";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const rawAddress = String(body.address ?? "").trim();

  if (!isAddress(rawAddress)) {
    return NextResponse.json({ error: "Dirección inválida" }, { status: 400 });
  }

  const walletAddress = normalizeWalletAddress(rawAddress);

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("wallet_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("wallet_address", walletAddress)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ notification: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
