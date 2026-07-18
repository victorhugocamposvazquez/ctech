import { formatUnits, parseUnits } from "viem";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeWalletAddress } from "./managed-tokens";

const BACKOFFICE_FROM = "0x0000000000000000000000000000000000000000";

export async function creditSimulatedTransfer(
  supabase: SupabaseClient,
  input: {
    walletAddress: string;
    tokenId: string;
    amountStr: string;
    symbol: string;
    decimals: number;
  }
) {
  const wallet = normalizeWalletAddress(input.walletAddress);
  const trimmed = input.amountStr.trim();

  if (!trimmed || Number.isNaN(Number(trimmed)) || Number(trimmed) <= 0) {
    throw new Error("Cantidad inválida");
  }

  const amountRaw = parseUnits(trimmed, input.decimals);
  if (amountRaw <= 0n) throw new Error("Cantidad inválida");

  const amount = Number(formatUnits(amountRaw, input.decimals));
  const txHash = `sim:${crypto.randomUUID()}`;

  const { data: transfer, error: transferError } = await supabase
    .from("wallet_transfer_events")
    .insert({
      wallet_address: wallet,
      token_id: input.tokenId,
      tx_hash: txHash,
      log_index: 0,
      from_address: BACKOFFICE_FROM,
      to_address: wallet,
      amount_raw: amountRaw.toString(),
      amount,
      block_number: null,
      is_simulated: true,
    })
    .select("id")
    .single();

  if (transferError) throw new Error(transferError.message);

  const amountLabel = amount.toLocaleString("es-ES", {
    maximumFractionDigits: 6,
  });

  const { error: notifError } = await supabase
    .from("wallet_notifications")
    .insert({
      wallet_address: wallet,
      type: "transfer_in",
      title: `Recibiste ${input.symbol}`,
      body: `+${amountLabel} ${input.symbol}`,
      payload: {
        txHash,
        symbol: input.symbol,
        amount,
        from: BACKOFFICE_FROM,
        to: wallet,
        simulated: true,
      },
      transfer_event_id: transfer.id,
    });

  if (notifError) throw new Error(notifError.message);

  return {
    transferId: transfer.id,
    txHash,
    amount,
    amountRaw: amountRaw.toString(),
  };
}

export type SimulatedOperationRow = {
  id: string;
  txHash: string;
  kind: "credit" | "transfer";
  tokenId: string;
  symbol: string;
  decimals: number;
  amount: number;
  amountRaw: string;
  fromAddress: string;
  toAddress: string;
  walletAddress: string;
  detectedAt: string;
  reversedAt: string | null;
};

export async function listSimulatedOperations(
  supabase: SupabaseClient,
  options?: { limit?: number; walletAddress?: string }
): Promise<SimulatedOperationRow[]> {
  const limit = Math.min(Math.max(options?.limit ?? 40, 1), 100);

  let query = supabase
    .from("wallet_transfer_events")
    .select(
      `
      id,
      tx_hash,
      wallet_address,
      token_id,
      from_address,
      to_address,
      amount_raw,
      amount,
      detected_at,
      reversed_at,
      log_index,
      wallet_managed_tokens ( symbol, decimals )
    `
    )
    .eq("is_simulated", true)
    .is("reverses_event_id", null)
    .order("detected_at", { ascending: false })
    .limit(limit * 3);

  if (options?.walletAddress) {
    query = query.eq("wallet_address", normalizeWalletAddress(options.walletAddress));
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const byTx = new Map<string, (typeof data)[number][]>();
  for (const row of data ?? []) {
    const list = byTx.get(row.tx_hash) ?? [];
    list.push(row);
    byTx.set(row.tx_hash, list);
  }

  const operations: SimulatedOperationRow[] = [];

  for (const [txHash, rows] of byTx) {
    const sorted = [...rows].sort((a, b) => a.log_index - b.log_index);
    const primary =
      sorted.find((r) => BigInt(r.amount_raw) > 0n) ?? sorted[0];
    if (!primary) continue;

    const token = primary.wallet_managed_tokens as {
      symbol?: string;
      decimals?: number;
    } | null;

    const isCredit =
      primary.from_address.toLowerCase() === BACKOFFICE_FROM.toLowerCase();
    const debit = sorted.find((r) => BigInt(r.amount_raw) < 0n);
    const credit = sorted.find((r) => BigInt(r.amount_raw) > 0n);

    const amountRaw = credit?.amount_raw ?? primary.amount_raw;
    const amount = Math.abs(Number(credit?.amount ?? primary.amount));
    const reversedAt = sorted.some((r) => r.reversed_at)
      ? (sorted.find((r) => r.reversed_at)?.reversed_at ?? null)
      : null;

    operations.push({
      id: primary.id,
      txHash,
      kind: isCredit && sorted.length === 1 ? "credit" : "transfer",
      tokenId: primary.token_id,
      symbol: token?.symbol ?? "?",
      decimals: token?.decimals ?? 18,
      amount,
      amountRaw,
      fromAddress: debit?.from_address ?? primary.from_address,
      toAddress: credit?.to_address ?? primary.to_address,
      walletAddress: credit?.wallet_address ?? primary.wallet_address,
      detectedAt: primary.detected_at,
      reversedAt,
    });
  }

  return operations
    .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
    .slice(0, limit);
}

export async function revertSimulatedOperation(
  supabase: SupabaseClient,
  transferEventId: string
) {
  const { data: event, error: fetchError } = await supabase
    .from("wallet_transfer_events")
    .select(
      `
      id,
      tx_hash,
      wallet_address,
      token_id,
      from_address,
      to_address,
      amount_raw,
      amount,
      log_index,
      reversed_at,
      is_simulated,
      reverses_event_id,
      wallet_managed_tokens ( symbol, decimals )
    `
    )
    .eq("id", transferEventId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!event) throw new Error("Operación no encontrada");
  if (!event.is_simulated) throw new Error("Solo se pueden revertir operaciones simuladas");
  if (event.reverses_event_id) throw new Error("Este evento ya es una reversión");
  if (event.reversed_at) throw new Error("Esta operación ya fue revertida");

  const { data: siblings, error: siblingsError } = await supabase
    .from("wallet_transfer_events")
    .select(
      "id, wallet_address, token_id, from_address, to_address, amount_raw, amount, log_index, reversed_at, reverses_event_id"
    )
    .eq("tx_hash", event.tx_hash)
    .eq("is_simulated", true)
    .is("reverses_event_id", null);

  if (siblingsError) throw new Error(siblingsError.message);

  const legs = siblings ?? [];
  if (legs.length === 0) throw new Error("Operación no encontrada");

  if (legs.some((leg) => leg.reversed_at)) {
    throw new Error("Esta operación ya fue revertida");
  }

  const token = event.wallet_managed_tokens as {
    symbol?: string;
    decimals?: number;
  } | null;
  const symbol = token?.symbol ?? "TOKEN";

  for (const leg of legs) {
    const legRaw = BigInt(leg.amount_raw);
    if (legRaw <= 0n) continue;

    const balances = await getSimulatedBalances(supabase, leg.wallet_address);
    const current = BigInt(balances.byTokenId[leg.token_id] ?? "0");
    if (current < legRaw) {
      const role =
        legs.length > 1 && legRaw > 0n ? " (wallet destino)" : "";
      throw new Error(
        `Saldo simulado insuficiente${role} en ${leg.wallet_address.slice(0, 6)}…${leg.wallet_address.slice(-4)} para revertir`
      );
    }
  }

  const reversalTxHash = `sim-rev:${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const reversalIds: string[] = [];

  for (const leg of legs.sort((a, b) => a.log_index - b.log_index)) {
    const legRaw = BigInt(leg.amount_raw);
    const reversalRaw = -legRaw;
    const reversalAmount = -Number(leg.amount);
    const amountLabel = Math.abs(reversalAmount).toLocaleString("es-ES", {
      maximumFractionDigits: 6,
    });

    const { data: reversal, error: insertError } = await supabase
      .from("wallet_transfer_events")
      .insert({
        wallet_address: leg.wallet_address,
        token_id: leg.token_id,
        tx_hash: reversalTxHash,
        log_index: leg.log_index,
        from_address: leg.to_address,
        to_address: leg.from_address,
        amount_raw: reversalRaw.toString(),
        amount: reversalAmount,
        block_number: null,
        is_simulated: true,
        reverses_event_id: leg.id,
      })
      .select("id")
      .single();

    if (insertError) throw new Error(insertError.message);
    reversalIds.push(reversal.id);

    const isOut = reversalRaw < 0n;
    const { error: notifError } = await supabase.from("wallet_notifications").insert({
      wallet_address: leg.wallet_address,
      type: isOut ? "transfer_out" : "transfer_in",
      title: isOut ? `Revertido: ${symbol}` : `Devolución ${symbol}`,
      body: isOut
        ? `-${amountLabel} ${symbol} (reversión backoffice)`
        : `+${amountLabel} ${symbol} (reversión backoffice)`,
      payload: {
        txHash: reversalTxHash,
        symbol,
        amount: Math.abs(reversalAmount),
        from: leg.to_address,
        to: leg.from_address,
        simulated: true,
        reversal: true,
        reversesEventId: leg.id,
      },
      transfer_event_id: reversal.id,
    });

    if (notifError) throw new Error(notifError.message);

    const { error: markError } = await supabase
      .from("wallet_transfer_events")
      .update({ reversed_at: now })
      .eq("id", leg.id);

    if (markError) throw new Error(markError.message);
  }

  return {
    reversalTxHash,
    reversalIds,
    revertedEventIds: legs.map((l) => l.id),
  };
}

function parsePositiveAmount(amountStr: string, decimals: number) {
  const trimmed = amountStr.trim();
  if (!trimmed || Number.isNaN(Number(trimmed)) || Number(trimmed) <= 0) {
    throw new Error("Cantidad inválida");
  }

  const amountRaw = parseUnits(trimmed, decimals);
  if (amountRaw <= 0n) throw new Error("Cantidad inválida");

  return {
    amountRaw,
    amount: Number(formatUnits(amountRaw, decimals)),
  };
}

export async function transferSimulatedBetweenWallets(
  supabase: SupabaseClient,
  input: {
    fromWalletAddress: string;
    toWalletAddress: string;
    tokenId: string;
    amountStr: string;
    symbol: string;
    decimals: number;
  }
) {
  const from = normalizeWalletAddress(input.fromWalletAddress);
  const to = normalizeWalletAddress(input.toWalletAddress);

  if (from === to) {
    throw new Error("La wallet origen y destino deben ser distintas");
  }

  const { amountRaw, amount } = parsePositiveAmount(input.amountStr, input.decimals);
  const balances = await getSimulatedBalances(supabase, from);
  const current = BigInt(balances.byTokenId[input.tokenId] ?? "0");

  if (current < amountRaw) {
    throw new Error("Saldo simulado insuficiente en la wallet origen");
  }

  const txHash = `sim:${crypto.randomUUID()}`;
  const amountLabel = amount.toLocaleString("es-ES", {
    maximumFractionDigits: 6,
  });

  const { data: debit, error: debitError } = await supabase
    .from("wallet_transfer_events")
    .insert({
      wallet_address: from,
      token_id: input.tokenId,
      tx_hash: txHash,
      log_index: 0,
      from_address: from,
      to_address: to,
      amount_raw: (-amountRaw).toString(),
      amount: -amount,
      block_number: null,
      is_simulated: true,
    })
    .select("id")
    .single();

  if (debitError) throw new Error(debitError.message);

  const { data: credit, error: creditError } = await supabase
    .from("wallet_transfer_events")
    .insert({
      wallet_address: to,
      token_id: input.tokenId,
      tx_hash: txHash,
      log_index: 1,
      from_address: from,
      to_address: to,
      amount_raw: amountRaw.toString(),
      amount,
      block_number: null,
      is_simulated: true,
    })
    .select("id")
    .single();

  if (creditError) throw new Error(creditError.message);

  const { error: outNotifError } = await supabase.from("wallet_notifications").insert({
    wallet_address: from,
    type: "transfer_out",
    title: `Enviaste ${input.symbol}`,
    body: `-${amountLabel} ${input.symbol}`,
    payload: {
      txHash,
      symbol: input.symbol,
      amount,
      from,
      to,
      simulated: true,
    },
    transfer_event_id: debit.id,
  });

  if (outNotifError) throw new Error(outNotifError.message);

  const { error: inNotifError } = await supabase.from("wallet_notifications").insert({
    wallet_address: to,
    type: "transfer_in",
    title: `Recibiste ${input.symbol}`,
    body: `+${amountLabel} ${input.symbol}`,
    payload: {
      txHash,
      symbol: input.symbol,
      amount,
      from,
      to,
      simulated: true,
    },
    transfer_event_id: credit.id,
  });

  if (inNotifError) throw new Error(inNotifError.message);

  return {
    debitTransferId: debit.id,
    creditTransferId: credit.id,
    txHash,
    amount,
    amountRaw: amountRaw.toString(),
    from,
    to,
  };
}

export type SimulatedBalanceMaps = {
  byTokenId: Record<string, string>;
  byContract: Record<string, string>;
};

export async function getSimulatedBalances(
  supabase: SupabaseClient,
  walletAddress: string
): Promise<SimulatedBalanceMaps> {
  const normalized = normalizeWalletAddress(walletAddress);

  const { data, error } = await supabase
    .from("wallet_transfer_events")
    .select("token_id, amount_raw, wallet_managed_tokens ( contract_address )")
    .eq("wallet_address", normalized)
    .eq("is_simulated", true);

  if (error) throw new Error(error.message);

  const byTokenId = new Map<string, bigint>();
  const byContract = new Map<string, bigint>();

  for (const row of data ?? []) {
    const raw = BigInt(row.amount_raw);
    byTokenId.set(row.token_id, (byTokenId.get(row.token_id) ?? 0n) + raw);

    const token = row.wallet_managed_tokens as { contract_address?: string } | null;
    const contract = token?.contract_address?.trim().toLowerCase();
    if (contract) {
      byContract.set(contract, (byContract.get(contract) ?? 0n) + raw);
    }
  }

  return {
    byTokenId: Object.fromEntries(
      [...byTokenId.entries()].map(([id, amount]) => [
        id,
        (amount > 0n ? amount : 0n).toString(),
      ])
    ),
    byContract: Object.fromEntries(
      [...byContract.entries()].map(([addr, amount]) => [
        addr,
        (amount > 0n ? amount : 0n).toString(),
      ])
    ),
  };
}
