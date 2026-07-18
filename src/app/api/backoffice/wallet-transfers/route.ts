import { NextResponse } from "next/server";
import { requireBackofficeAdmin } from "@/lib/backoffice/auth";
import { normalizeWalletAddress } from "@/lib/wallet/managed-tokens";
import { transferSimulatedBetweenWallets } from "@/lib/wallet/simulated-credit";
import { isAddress } from "viem";

async function assertRegisteredWallet(
  supabase: NonNullable<Awaited<ReturnType<typeof requireBackofficeAdmin>>["supabase"]>,
  walletAddress: string,
  label: string
) {
  const { data, error } = await supabase
    .from("wallet_registered_addresses")
    .select("id")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error(`${label} no está registrada en el backoffice`);
}

async function assertActiveToken(
  supabase: NonNullable<Awaited<ReturnType<typeof requireBackofficeAdmin>>["supabase"]>,
  tokenId: string
) {
  const { data, error } = await supabase
    .from("wallet_managed_tokens")
    .select("id, symbol, decimals, is_active")
    .eq("id", tokenId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.is_active) throw new Error("Token no encontrado o inactivo");
  return data;
}

export async function POST(req: Request) {
  const { error, supabase } = await requireBackofficeAdmin();
  if (error || !supabase) {
    return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const rawFrom = String(body.from_wallet_address ?? body.from_address ?? "").trim();
  const rawTo = String(body.to_wallet_address ?? body.to_address ?? "").trim();
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
      { error: "La wallet origen y destino deben ser distintas" },
      { status: 400 }
    );
  }

  try {
    await assertRegisteredWallet(supabase, fromWalletAddress, "La wallet origen");
    await assertRegisteredWallet(supabase, toWalletAddress, "La wallet destino");
    const token = await assertActiveToken(supabase, tokenId);

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
    const status =
      message.includes("insuficiente") || message.includes("distintas")
        ? 400
        : message.includes("no está registrada") || message.includes("no encontrado")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
