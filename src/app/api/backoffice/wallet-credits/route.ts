import { NextResponse } from "next/server";
import { requireBackofficeAdmin } from "@/lib/backoffice/auth";
import { normalizeWalletAddress } from "@/lib/wallet/managed-tokens";
import { creditSimulatedTransfer } from "@/lib/wallet/simulated-credit";
import { isAddress } from "viem";

export async function POST(req: Request) {
  const { error, supabase } = await requireBackofficeAdmin();
  if (error || !supabase) {
    return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const rawAddress = String(body.wallet_address ?? body.address ?? "").trim();
  const tokenId = String(body.token_id ?? "").trim();
  const amountStr = String(body.amount ?? "").trim();

  if (!isAddress(rawAddress)) {
    return NextResponse.json({ error: "Dirección inválida" }, { status: 400 });
  }

  if (!tokenId) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  if (!amountStr || Number.isNaN(Number(amountStr)) || Number(amountStr) <= 0) {
    return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
  }

  const walletAddress = normalizeWalletAddress(rawAddress);

  const { data: wallet, error: walletError } = await supabase
    .from("wallet_registered_addresses")
    .select("id")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (walletError) {
    return NextResponse.json({ error: walletError.message }, { status: 500 });
  }

  if (!wallet) {
    return NextResponse.json(
      { error: "La wallet no está registrada en el backoffice" },
      { status: 404 }
    );
  }

  const { data: token, error: tokenError } = await supabase
    .from("wallet_managed_tokens")
    .select("id, symbol, decimals, is_active")
    .eq("id", tokenId)
    .maybeSingle();

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 });
  }

  if (!token?.is_active) {
    return NextResponse.json({ error: "Token no encontrado o inactivo" }, { status: 400 });
  }

  try {
    const result = await creditSimulatedTransfer(supabase, {
      walletAddress,
      tokenId: token.id,
      amountStr,
      symbol: token.symbol,
      decimals: token.decimals,
    });

    return NextResponse.json({ ok: true, credit: result }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
