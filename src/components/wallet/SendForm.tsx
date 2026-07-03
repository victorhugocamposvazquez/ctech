"use client";

import {
  formatUnits,
  parseUnits,
  isAddress,
  encodeFunctionData,
  type Address,
} from "viem";
import { useState } from "react";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { useLocalWallet } from "@/contexts/LocalWalletContext";
import { getWalletTokens, erc20BalanceAbi } from "@/lib/wallet/tokens";
import { formatTokenAmount } from "@/lib/wallet/format";
import { usePortfolio } from "@/hooks/wallet/usePortfolio";
import { useWalletSession } from "@/hooks/wallet/useWalletSession";
import { walletChain } from "@/lib/wallet/config";

export function SendForm() {
  const { mode } = useWalletSession();
  const { sendTransaction: sendLocal } = useLocalWallet();
  const { assets } = usePortfolio();
  const tokens = getWalletTokens();

  const [tokenId, setTokenId] = useState(tokens[1]?.id ?? "usdt");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [localPending, setLocalPending] = useState(false);
  const [localTxHash, setLocalTxHash] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const selected = tokens.find((t) => t.id === tokenId)!;
  const asset = assets.find((a) => a.token.id === tokenId);

  const { sendTransaction: sendExternal, data: extTxHash, isPending: extPending, error: extError } = useSendTransaction();
  const { isLoading: extConfirming } = useWaitForTransactionReceipt({ hash: extTxHash });

  const handleSend = async () => {
    if (!isAddress(to)) return;
    const parsed = parseUnits(amount || "0", selected.decimals);
    if (parsed <= 0n) return;

    if (mode === "local") {
      setLocalPending(true);
      setLocalError(null);
      try {
        let hash: string;
        if (selected.isNative) {
          hash = await sendLocal({ to: to as Address, value: parsed });
        } else {
          if (!selected.address) return;
          hash = await sendLocal({
            to: selected.address,
            data: encodeFunctionData({
              abi: erc20BalanceAbi,
              functionName: "transfer",
              args: [to as Address, parsed],
            }),
          });
        }
        setLocalTxHash(hash);
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : "Transaction failed");
      } finally {
        setLocalPending(false);
      }
      return;
    }

    if (selected.isNative) {
      sendExternal({ to: to as Address, value: parsed, chainId: walletChain.id });
      return;
    }
    if (!selected.address) return;
    sendExternal({
      to: selected.address,
      data: encodeFunctionData({ abi: erc20BalanceAbi, functionName: "transfer", args: [to as Address, parsed] }),
      chainId: walletChain.id,
    });
  };

  const setMax = () => {
    if (!asset) return;
    if (selected.isNative && asset.rawBalance > 0n) {
      const max = asset.rawBalance > parseUnits("0.001", 18) ? asset.rawBalance - parseUnits("0.001", 18) : 0n;
      setAmount(formatUnits(max, selected.decimals));
      return;
    }
    setAmount(formatUnits(asset.rawBalance, selected.decimals));
  };

  const isPending = mode === "local" ? localPending : extPending;
  const isConfirming = mode === "local" ? false : extConfirming;
  const txHash = mode === "local" ? localTxHash : extTxHash;
  const error = mode === "local" ? localError : extError?.message;

  return (
    <div className="wallet-screen pt-4">
      <h1 className="wallet-page-title">Send</h1>
      <p className="wallet-page-subtitle">Transfer crypto to another wallet</p>

      <div className="mt-8 space-y-5">
        <div>
          <label className="wallet-label">Asset</label>
          <select value={tokenId} onChange={(e) => setTokenId(e.target.value)} className="wallet-input appearance-none">
            {tokens.map((t) => (
              <option key={t.id} value={t.id} className="bg-wallet-elevated">{t.symbol} — {t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="wallet-label">To address</label>
          <input type="text" placeholder="0x…" value={to} onChange={(e) => setTo(e.target.value)} className="wallet-input font-mono text-sm" />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="wallet-label !mb-0">Amount</label>
            <button type="button" onClick={setMax} className="text-xs font-bold text-wallet-accent">MAX</button>
          </div>
          <input type="text" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="wallet-input text-2xl font-bold" />
          {asset && (
            <p className="mt-2 text-sm text-wallet-muted">
              Available: {formatTokenAmount(asset.rawBalance, selected.decimals)} {selected.symbol}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={isPending || isConfirming || !isAddress(to) || !amount || parseFloat(amount) <= 0}
        onClick={() => void handleSend()}
        className="wallet-btn-primary mt-8"
      >
        {isPending || isConfirming ? "Sending…" : "Send"}
      </button>

      {txHash && <p className="mt-4 break-all text-center text-xs text-wallet-accent">Tx: {txHash.slice(0, 10)}…{txHash.slice(-8)}</p>}
      {error && <p className="mt-2 text-center text-sm text-wallet-danger">{error}</p>}
    </div>
  );
}
