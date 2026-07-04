import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWalletAddress } from "@/lib/wallet/managed-tokens";
import { transferSimulatedBetweenWallets } from "@/lib/wallet/simulated-credit";
import { isAddress } from "viem";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawFrom = String(body.from_address ?? "").trim();
  const rawTo = String(body.to_address ?? "").trim();
  const tokenId = String(body.token_id ?? "").trim();
  const amountStr = String(body.amount ?? "").trim();

  if (!isAddress(rawFrom) || !isAddress(rawTo)) {
    return NextResponse.json({ error: "Dirección inválida" }, { status: 400 });
  }

  if (!tokenId) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  if (!amountStr || Number.isNaN(Number(amountStr)) || Number(amountStr) <= 0) {
    return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
  }

  const fromWalletAddress = normalizeWalletAddress(rawFrom);
  const toWalletAddress = normalizeWalletAddress(rawTo);

  if (fromWalletAddress === toWalletAddress) {
    return NextResponse.json(
      { error: "No puedes enviar a tu propia wallet" },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();

    const [{ data: fromWallet }, { data: toWallet }, { data: token }] =
      await Promise.all([
        supabase
          .from("wallet_registered_addresses")
          .select("id")
          .eq("wallet_address", fromWalletAddress)
          .maybeSingle(),
        supabase
          .from("wallet_registered_addresses")
          .select("id")
          .eq("wallet_address", toWalletAddress)
          .maybeSingle(),
        supabase
          .from("wallet_managed_tokens")
          .select("id, symbol, decimals, is_active")
          .eq("id", tokenId)
          .maybeSingle(),
      ]);

    if (!fromWallet) {
      return NextResponse.json(
        { error: "Tu wallet no está registrada para envíos simulados" },
        { status: 403 }
      );
    }

    if (!toWallet) {
      return NextResponse.json(
        { error: "La wallet destino no está registrada" },
        { status: 404 }
      );
    }

    if (!token?.is_active) {
      return NextResponse.json({ error: "Token no disponible" }, { status: 400 });
    }

    const result = await transferSimulatedBetweenWallets(supabase, {
      fromWalletAddress,
      toWalletAddress,
      tokenId: token.id,
      amountStr,
      symbol: token.symbol,
      decimals: token.decimals,
    });

    return NextResponse.json({ ok: true, transfer: result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("insuficiente") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
