"use client";

import { useState } from "react";
import {
  formatUnits,
  parseUnits,
  isAddress,
  encodeFunctionData,
  type Address,
} from "viem";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { getWalletTokens, erc20BalanceAbi } from "@/lib/wallet/tokens";
import { formatTokenAmount } from "@/lib/wallet/format";
import { usePortfolio } from "@/hooks/wallet/usePortfolio";
import { walletChain } from "@/lib/wallet/config";

export function SendForm() {
  const { address } = useAccount();
  const { assets } = usePortfolio();
  const tokens = getWalletTokens();

  const [tokenId, setTokenId] = useState(tokens[1]?.id ?? "usdt");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");

  const selected = tokens.find((t) => t.id === tokenId)!;
  const asset = assets.find((a) => a.token.id === tokenId);

  const {
    sendTransaction,
    data: txHash,
    isPending,
    error,
  } = useSendTransaction();

  const { isLoading: confirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleSend = () => {
    if (!address || !isAddress(to)) return;
    const parsed = parseUnits(amount || "0", selected.decimals);
    if (parsed <= 0n) return;

    if (selected.isNative) {
      sendTransaction({
        to: to as Address,
        value: parsed,
        chainId: walletChain.id,
      });
      return;
    }

    if (!selected.address) return;

    sendTransaction({
      to: selected.address,
      data: encodeFunctionData({
        abi: erc20BalanceAbi,
        functionName: "transfer",
        args: [to as Address, parsed],
      }),
      chainId: walletChain.id,
    });
  };

  const setMax = () => {
    if (!asset) return;
    if (selected.isNative && asset.rawBalance > 0n) {
      const gasReserve = parseUnits("0.001", 18);
      const max =
        asset.rawBalance > gasReserve ? asset.rawBalance - gasReserve : 0n;
      setAmount(formatUnits(max, selected.decimals));
      return;
    }
    setAmount(formatUnits(asset.rawBalance, selected.decimals));
  };

  return (
    <div className="space-y-5 px-4 pt-4">
      <div>
        <label className="text-xs font-medium text-wallet-muted">Activo</label>
        <select
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-wallet-border bg-wallet-card px-4 py-3.5 text-wallet-text outline-none focus:border-wallet-accent"
        >
          {tokens.map((t) => (
            <option key={t.id} value={t.id}>
              {t.symbol} — {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-wallet-muted">Destino</label>
        <input
          type="text"
          placeholder="0x…"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-wallet-border bg-wallet-card px-4 py-3.5 font-mono text-sm text-wallet-text outline-none focus:border-wallet-accent"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-wallet-muted">Cantidad</label>
          <button
            type="button"
            onClick={setMax}
            className="text-xs font-semibold text-wallet-accent"
          >
            Máx
          </button>
        </div>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-wallet-border bg-wallet-card px-4 py-3.5 text-lg font-semibold text-wallet-text outline-none focus:border-wallet-accent"
        />
        {asset && (
          <p className="mt-1 text-xs text-wallet-muted">
            Disponible:{" "}
            {formatTokenAmount(asset.rawBalance, selected.decimals)}{" "}
            {selected.symbol}
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={
          isPending ||
          confirming ||
          !isAddress(to) ||
          !amount ||
          parseFloat(amount) <= 0
        }
        onClick={handleSend}
        className="w-full rounded-2xl bg-wallet-accent py-4 font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
      >
        {isPending || confirming ? "Enviando…" : "Enviar"}
      </button>

      {txHash && (
        <p className="break-all text-center text-xs text-green-400">
          Tx: {txHash.slice(0, 10)}…{txHash.slice(-8)}
        </p>
      )}
      {error && (
        <p className="text-center text-sm text-red-400">{error.message}</p>
      )}
    </div>
  );
}
