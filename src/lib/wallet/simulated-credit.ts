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
      [...byTokenId.entries()].map(([id, amount]) => [id, amount.toString()])
    ),
    byContract: Object.fromEntries(
      [...byContract.entries()].map(([addr, amount]) => [addr, amount.toString()])
    ),
  };
}
