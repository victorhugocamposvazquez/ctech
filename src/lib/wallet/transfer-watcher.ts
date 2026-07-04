import {
  createPublicClient,
  formatUnits,
  http,
  parseAbiItem,
  type Address,
} from "viem";
import { bsc } from "viem/chains";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getWalletRpcUrl } from "./rpc";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

type ManagedToken = {
  id: string;
  symbol: string;
  contract_address: string;
  decimals: number;
};

type RegisteredWallet = {
  id: string;
  wallet_address: string;
  last_scanned_block: number;
};

function getClient() {
  return createPublicClient({
    chain: bsc,
    transport: http(getWalletRpcUrl()),
  });
}

export async function watchWalletTransfers(
  supabase: SupabaseClient,
  options?: { maxWallets?: number; blockChunk?: bigint }
) {
  const maxWallets = options?.maxWallets ?? 50;
  const blockChunk = options?.blockChunk ?? 2_000n;

  const { data: tokens, error: tokensError } = await supabase
    .from("wallet_managed_tokens")
    .select("id, symbol, contract_address, decimals")
    .eq("is_active", true)
    .eq("network", "bsc");

  if (tokensError) throw new Error(tokensError.message);
  if (!tokens?.length) {
    return { walletsScanned: 0, transfersDetected: 0, notificationsCreated: 0 };
  }

  const { data: wallets, error: walletsError } = await supabase
    .from("wallet_registered_addresses")
    .select("id, wallet_address, last_scanned_block")
    .order("updated_at", { ascending: true })
    .limit(maxWallets);

  if (walletsError) throw new Error(walletsError.message);
  if (!wallets?.length) {
    return { walletsScanned: 0, transfersDetected: 0, notificationsCreated: 0 };
  }

  const client = getClient();
  const latestBlock = await client.getBlockNumber();

  let transfersDetected = 0;
  let notificationsCreated = 0;

  for (const wallet of wallets as RegisteredWallet[]) {
    const walletAddress = wallet.wallet_address.toLowerCase() as Address;
    const fromBlock =
      wallet.last_scanned_block > 0
        ? BigInt(wallet.last_scanned_block) + 1n
        : latestBlock > 5_000n
          ? latestBlock - 5_000n
          : 0n;

    let cursor = fromBlock;
    let highestSeen = wallet.last_scanned_block;

    while (cursor <= latestBlock) {
      const toBlock =
        cursor + blockChunk > latestBlock ? latestBlock : cursor + blockChunk;

      for (const token of tokens as ManagedToken[]) {
        const tokenAddress = token.contract_address as Address;

        const logs = await client.getLogs({
          address: tokenAddress,
          event: transferEvent,
          args: { to: walletAddress },
          fromBlock: cursor,
          toBlock,
        });

        for (const log of logs) {
          const txHash = log.transactionHash;
          const logIndex = log.logIndex ?? 0;
          const from = (log.args.from ?? "0x0").toLowerCase();
          const to = (log.args.to ?? walletAddress).toLowerCase();
          const raw = log.args.value?.toString() ?? "0";
          const amount = Number(formatUnits(BigInt(raw), token.decimals));
          const blockNumber = Number(log.blockNumber);

          if (blockNumber > highestSeen) highestSeen = blockNumber;

          const { data: inserted, error: insertError } = await supabase
            .from("wallet_transfer_events")
            .insert({
              wallet_address: walletAddress,
              token_id: token.id,
              tx_hash: txHash,
              log_index: logIndex,
              from_address: from,
              to_address: to,
              amount_raw: raw,
              amount,
              block_number: blockNumber,
            })
            .select("id")
            .maybeSingle();

          if (insertError) {
            if (insertError.code === "23505") continue;
            throw new Error(insertError.message);
          }

          if (!inserted) continue;

          transfersDetected += 1;

          const amountLabel = amount.toLocaleString("es-ES", {
            maximumFractionDigits: 6,
          });

          const { error: notifError } = await supabase
            .from("wallet_notifications")
            .insert({
              wallet_address: walletAddress,
              type: "transfer_in",
              title: `Recibiste ${token.symbol}`,
              body: `+${amountLabel} ${token.symbol} desde ${from.slice(0, 6)}…${from.slice(-4)}`,
              payload: {
                txHash,
                symbol: token.symbol,
                amount,
                from,
                to,
                blockNumber,
              },
              transfer_event_id: inserted.id,
            });

          if (notifError) throw new Error(notifError.message);
          notificationsCreated += 1;
        }
      }

      cursor = toBlock + 1n;
    }

    await supabase
      .from("wallet_registered_addresses")
      .update({ last_scanned_block: highestSeen })
      .eq("id", wallet.id);
  }

  return {
    walletsScanned: wallets.length,
    transfersDetected,
    notificationsCreated,
    latestBlock: Number(latestBlock),
  };
}
