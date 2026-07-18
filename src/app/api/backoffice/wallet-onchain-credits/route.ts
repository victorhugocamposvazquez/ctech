import { NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import { requireBackofficeAdmin } from "@/lib/backoffice/auth";
import {
  getTreasuryAddress,
  isTreasuryConfigured,
  treasuryTransferErc20,
  treasuryTransferNative,
} from "@/lib/wallet/treasury";
import { normalizeWalletAddress } from "@/lib/wallet/managed-tokens";
import { watchWalletTransfersForAddress } from "@/lib/wallet/transfer-watcher";

export async function GET() {
  const { error, supabase } = await requireBackofficeAdmin();
  if (error || !supabase) {
    return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  const { data, error: dbError } = await supabase
    .from("wallet_credit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({
    credits: data ?? [],
    treasuryConfigured: isTreasuryConfigured(),
    treasuryAddress: getTreasuryAddress(),
  });
}

export async function POST(req: Request) {
  const { error, supabase, user } = await requireBackofficeAdmin();
  if (error || !supabase) {
    return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  if (!isTreasuryConfigured()) {
    return NextResponse.json(
      {
        error:
          "Treasury no configurada. Añade WALLET_TREASURY_PRIVATE_KEY en Vercel con una wallet que tenga BNB (gas) y tokens BEP-20.",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const toRaw = String(body.wallet_address ?? "").trim();
  const amount = String(body.amount ?? "").trim();
  const note = body.note ? String(body.note).trim() : null;
  const tokenId = body.token_id ? String(body.token_id) : null;
  const symbol = body.symbol ? String(body.symbol).trim().toUpperCase() : null;

  if (!isAddress(toRaw)) {
    return NextResponse.json({ error: "wallet_address inválida" }, { status: 400 });
  }

  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "amount debe ser mayor que cero" }, { status: 400 });
  }

  const to = normalizeWalletAddress(toRaw) as Address;

  await supabase
    .from("wallet_registered_addresses")
    .upsert({ wallet_address: to }, { onConflict: "wallet_address" });

  let tokenSymbol = symbol ?? "";
  let tokenUuid: string | null = null;
  let txHash: string;
  let amountRaw: string;
  let amountFormatted: string;

  if (symbol === "BNB") {
    const result = await treasuryTransferNative({ to, amount });
    txHash = result.hash;
    amountRaw = result.amountRaw.toString();
    amountFormatted = result.amountFormatted;
    tokenSymbol = "BNB";
  } else {
    if (!tokenId) {
      return NextResponse.json(
        { error: "token_id o symbol=BNB son obligatorios" },
        { status: 400 }
      );
    }

    const { data: token, error: tokenError } = await supabase
      .from("wallet_managed_tokens")
      .select("id, symbol, contract_address, decimals, is_active")
      .eq("id", tokenId)
      .maybeSingle();

    if (tokenError || !token) {
      return NextResponse.json({ error: "Token no encontrado" }, { status: 404 });
    }

    if (!token.is_active) {
      return NextResponse.json({ error: "El token no está activo" }, { status: 400 });
    }

    if (!isAddress(token.contract_address)) {
      return NextResponse.json({ error: "contract_address del token inválida" }, { status: 500 });
    }

    const result = await treasuryTransferErc20({
      tokenAddress: token.contract_address as Address,
      to,
      amount,
      decimals: token.decimals,
    });

    txHash = result.hash;
    amountRaw = result.amountRaw.toString();
    amountFormatted = result.amountFormatted;
    tokenSymbol = token.symbol;
    tokenUuid = token.id;
  }

  const { data: credit, error: insertError } = await supabase
    .from("wallet_credit_events")
    .insert({
      wallet_address: to,
      token_id: tokenUuid,
      token_symbol: tokenSymbol,
      amount: amountFormatted,
      amount_raw: amountRaw,
      tx_hash: txHash,
      status: "confirmed",
      credited_by: user?.email ?? user?.id ?? null,
      note,
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json(
      {
        error: insertError.message,
        tx_hash: txHash,
        warning: "Transferencia enviada pero no se pudo guardar el registro de auditoría",
      },
      { status: 500 }
    );
  }

  try {
    await watchWalletTransfersForAddress(supabase, to, { lookbackBlocks: 20n });
  } catch {
    /* notificación opcional; el saldo on-chain ya es visible en cualquier wallet */
  }

  return NextResponse.json(
    {
      credit,
      tx_hash: txHash,
      message:
        "Tokens enviados on-chain. El saldo será visible en MetaMask, Trust Wallet y cualquier wallet con la misma dirección en BSC.",
    },
    { status: 201 }
  );
}
