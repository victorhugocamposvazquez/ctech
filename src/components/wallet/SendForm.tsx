"use client";

import {
  formatUnits,
  parseUnits,
  isAddress,
  encodeFunctionData,
  formatEther,
  type Address,
} from "viem";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import Image from "next/image";
import { useLocalWallet } from "@/contexts/LocalWalletContext";
import { getWalletTokens, erc20BalanceAbi } from "@/lib/wallet/tokens";
import { resolveManagedTokenId } from "@/lib/wallet/managed-tokens";
import { formatTokenAmount, formatUsd } from "@/lib/wallet/format";
import { getPublicClient } from "@/lib/wallet/public-client";
import { usePortfolio } from "@/hooks/wallet/usePortfolio";
import { useManagedTokens } from "@/hooks/wallet/useManagedTokens";
import { useWalletSession } from "@/hooks/wallet/useWalletSession";
import { walletChain } from "@/lib/wallet/config";
import { t } from "@/lib/wallet/i18n";
import { saveTx } from "@/lib/wallet/tx-history";
import { notifyTxSaved } from "@/hooks/wallet/useTxHistory";
import { ConfirmSheet } from "./ConfirmSheet";
import { TxReceipt } from "./TxReceipt";

type Step = "form" | "success";

export function SendForm() {
  const { mode, address: fromAddress } = useWalletSession();
  const { sendTransaction: sendLocal } = useLocalWallet();
  const { assets } = usePortfolio();
  const { data: managedTokens } = useManagedTokens();
  const tokens = getWalletTokens(managedTokens);

  const assetById = useMemo(
    () => new Map(assets.map((item) => [item.token.id, item])),
    [assets]
  );

  const sortedTokens = useMemo(() => {
    return [...tokens].sort((a, b) => {
      const aHas = (assetById.get(a.id)?.rawBalance ?? 0n) > 0n;
      const bHas = (assetById.get(b.id)?.rawBalance ?? 0n) > 0n;
      if (aHas === bHas) return 0;
      return aHas ? -1 : 1;
    });
  }, [tokens, assetById]);

  const [tokenId, setTokenId] = useState<string | undefined>(undefined);
  const selectedTokenId = tokenId ?? sortedTokens[0]?.id ?? "bnb";
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [localTxHash, setLocalTxHash] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: simulatedCredits = { byTokenId: {}, byContract: {} } } = useQuery({
    queryKey: ["wallet-simulated-credits", fromAddress?.toLowerCase()],
    queryFn: async () => {
      const res = await fetch(
        `/api/wallet/credits?address=${encodeURIComponent(fromAddress!)}`
      );
      const json = await res.json();
      if (!res.ok) return { byTokenId: {}, byContract: {} };
      return {
        byTokenId: json.balances ?? {},
        byContract: json.balancesByContract ?? {},
      };
    },
    enabled: !!fromAddress,
    staleTime: 15_000,
  });

  const selected = tokens.find((tok) => tok.id === selectedTokenId)!;
  const asset = assets.find((a) => a.token.id === selectedTokenId);

  const parsedAmount =
    amount && !Number.isNaN(Number(amount))
      ? parseUnits(amount, selected.decimals)
      : 0n;

  const managedTokenId = useMemo(
    () =>
      resolveManagedTokenId(
        selected.id,
        selected.address,
        managedTokens?.map((token) => ({ id: token.id, address: token.address }))
      ),
    [selected, managedTokens]
  );

  const simulatedRaw = useMemo(() => {
    if (selected.address) {
      const byContract =
        simulatedCredits.byContract[selected.address.toLowerCase()];
      if (byContract) return BigInt(byContract);
    }
    const byId = simulatedCredits.byTokenId[selected.id];
    if (byId) return BigInt(byId);
    if (managedTokenId) {
      const byManagedId = simulatedCredits.byTokenId[managedTokenId];
      if (byManagedId) return BigInt(byManagedId);
    }
    return 0n;
  }, [selected, simulatedCredits, managedTokenId]);

  const { data: destRegistered } = useQuery({
    queryKey: ["wallet-registered", to.toLowerCase()],
    queryFn: async () => {
      const res = await fetch(
        `/api/wallet/registered?address=${encodeURIComponent(to)}`
      );
      const json = await res.json();
      if (!res.ok) return false;
      return json.registered === true;
    },
    enabled: isAddress(to),
    staleTime: 30_000,
  });

  const onChainRaw = asset ? asset.rawBalance - simulatedRaw : 0n;
  const useSimulatedTransfer =
    !selected.isNative &&
    parsedAmount > 0n &&
    simulatedRaw >= parsedAmount &&
    !!managedTokenId &&
    destRegistered === true;

  const destNeedsRegistration =
    !selected.isNative &&
    parsedAmount > 0n &&
    simulatedRaw >= parsedAmount &&
    isAddress(to) &&
    destRegistered === false;

  const { sendTransaction: sendExternal, data: extTxHash, isPending: extPending, error: extError } =
    useSendTransaction();
  const { isLoading: extConfirming, isSuccess: extSuccess } =
    useWaitForTransactionReceipt({ hash: extTxHash });

  const persistTx = (hash: string) => {
    if (!fromAddress) return;
    saveTx({
      hash,
      from: fromAddress as Address,
      to: to as Address,
      symbol: selected.symbol,
      amount,
      timestamp: Date.now(),
      direction: "out",
    });
    notifyTxSaved();
  };

  const valid =
    isAddress(to) &&
    parsedAmount > 0n &&
    asset &&
    parsedAmount <= asset.rawBalance &&
    (useSimulatedTransfer || onChainRaw >= parsedAmount);

  useEffect(() => {
    if (!valid || !fromAddress || useSimulatedTransfer) {
      setGasEstimate(null);
      return;
    }
    let cancelled = false;
    const client = getPublicClient();
    void (async () => {
      try {
        let estimate: bigint;
        if (selected.isNative) {
          estimate = await client.estimateGas({
            account: fromAddress as Address,
            to: to as Address,
            value: parsedAmount,
          });
        } else if (selected.address) {
          estimate = await client.estimateGas({
            account: fromAddress as Address,
            to: selected.address,
            data: encodeFunctionData({
              abi: erc20BalanceAbi,
              functionName: "transfer",
              args: [to as Address, parsedAmount],
            }),
          });
        } else return;
        const gasPrice = await client.getGasPrice();
        if (!cancelled) setGasEstimate(formatEther(estimate * gasPrice));
      } catch {
        if (!cancelled) setGasEstimate(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [valid, fromAddress, to, parsedAmount, selected, useSimulatedTransfer]);

  const executeSend = async () => {
    if (!valid || !fromAddress) return;
    setBusy(true);
    setLocalError(null);

    try {
      if (useSimulatedTransfer) {
        const res = await fetch("/api/wallet/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_address: fromAddress,
            to_address: to,
            token_id: managedTokenId,
            contract_address: selected.address,
            amount: amount.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? t.txFailed);
        }

        const txHash = String(json.transfer?.txHash ?? "");
        persistTx(txHash);
        setLocalTxHash(txHash);
        setStep("success");
        setConfirmOpen(false);
        void queryClient.invalidateQueries({
          queryKey: ["wallet-simulated-credits", fromAddress.toLowerCase()],
        });
        window.dispatchEvent(new Event("wallet-transfer-received"));
        return;
      }

      if (mode === "local") {
        let hash: `0x${string}`;
        if (selected.isNative) {
          hash = await sendLocal({ to: to as Address, value: parsedAmount });
        } else if (selected.address) {
          hash = await sendLocal({
            to: selected.address,
            data: encodeFunctionData({
              abi: erc20BalanceAbi,
              functionName: "transfer",
              args: [to as Address, parsedAmount],
            }),
          });
        } else return;

        const client = getPublicClient();
        await client.waitForTransactionReceipt({ hash });
        persistTx(hash);
        setLocalTxHash(hash);
        setStep("success");
        setConfirmOpen(false);
        return;
      }

      if (selected.isNative) {
        sendExternal({ to: to as Address, value: parsedAmount, chainId: walletChain.id });
      } else if (selected.address) {
        sendExternal({
          to: selected.address,
          data: encodeFunctionData({
            abi: erc20BalanceAbi,
            functionName: "transfer",
            args: [to as Address, parsedAmount],
          }),
          chainId: walletChain.id,
        });
      }
      setConfirmOpen(false);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : t.txFailed);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (extSuccess && extTxHash) {
      persistTx(extTxHash);
      setStep("success");
      setLocalTxHash(extTxHash);
    }
  }, [extSuccess, extTxHash]);

  const reset = () => {
    setStep("form");
    setTo("");
    setAmount("");
    setTokenId(undefined);
    setLocalTxHash(null);
    setLocalError(null);
  };

  const txHash = localTxHash ?? extTxHash ?? null;
  const error = localError ?? extError?.message;
  const isPending = mode === "local" ? busy : extPending || extConfirming;

  if (step === "success" && txHash) {
    return (
      <div className="wallet-screen pt-4">
        <TxReceipt hash={txHash} onReset={reset} />
      </div>
    );
  }

  return (
    <div className="wallet-screen pt-4">
      <h1 className="wallet-page-title">{t.sendTitle}</h1>
      <p className="wallet-page-subtitle">{t.sendSubtitle}</p>

      <div className="mt-8 space-y-5">
        <div>
          <label className="wallet-label">{t.asset}</label>
          <div className="wallet-token-picker">
            {sortedTokens.map((tok) => {
              const tokAsset = assetById.get(tok.id);
              const rawBalance = tokAsset?.rawBalance ?? 0n;
              const hasBalance = rawBalance > 0n;
              const isActive = selectedTokenId === tok.id;

              return (
                <button
                  key={tok.id}
                  type="button"
                  onClick={() => setTokenId(tok.id)}
                  className={`wallet-token-option ${isActive ? "active" : ""} ${
                    !hasBalance ? "wallet-token-option--empty" : ""
                  }`}
                >
                  <Image src={tok.logo} alt="" width={32} height={32} className="rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-wallet-text">{tok.symbol}</p>
                    <p className="text-xs text-wallet-muted">{tok.name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-semibold tabular-nums leading-tight text-wallet-text">
                      {formatTokenAmount(rawBalance, tok.decimals, 5)} {tok.symbol}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-wallet-muted">
                      {formatUsd(tokAsset?.usdValue ?? 0)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="wallet-label !mb-0">{t.toAddress}</label>
            <button
              type="button"
              onClick={() => void navigator.clipboard.readText().then((text) => {
                const trimmed = text.trim();
                if (trimmed.startsWith("0x")) setTo(trimmed);
              })}
              className="text-xs font-bold text-wallet-accent"
            >
              {t.paste}
            </button>
          </div>
          <input
            type="text"
            placeholder="0x…"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="wallet-input font-mono text-sm"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="wallet-label !mb-0">{t.amount}</label>
            <button
              type="button"
              onClick={() => {
                if (!asset) return;
                if (selected.isNative && asset.rawBalance > parseUnits("0.001", 18)) {
                  setAmount(
                    formatUnits(asset.rawBalance - parseUnits("0.001", 18), selected.decimals)
                  );
                } else {
                  setAmount(formatUnits(asset.rawBalance, selected.decimals));
                }
              }}
              className="text-xs font-bold text-wallet-accent"
            >
              {t.max}
            </button>
          </div>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="wallet-input text-2xl font-bold"
          />
          {asset && (
            <p className="mt-2 text-sm text-wallet-muted">
              {t.available}: {formatTokenAmount(asset.rawBalance, selected.decimals)}{" "}
              {selected.symbol}
            </p>
          )}
          {destNeedsRegistration && (
            <p className="mt-2 text-xs text-wallet-danger">
              La wallet destino no está registrada. Regístrala en el backoffice para poder enviar.
            </p>
          )}
          {gasEstimate && selected.isNative && !useSimulatedTransfer && (
            <p className="mt-1 text-xs text-wallet-muted">
              {t.networkFee}: ~{gasEstimate} BNB
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={!valid || isPending}
        onClick={() => setConfirmOpen(true)}
        className="wallet-btn-primary mt-8"
      >
        {isPending ? t.sending : t.review}
      </button>

      {error && <p className="mt-3 text-center text-sm text-wallet-danger">{error}</p>}

      <ConfirmSheet
        open={confirmOpen}
        title={t.confirmSend}
        busy={isPending}
        rows={[
          { label: t.asset, value: `${amount} ${selected.symbol}` },
          { label: t.toAddress, value: to, mono: true },
          ...(gasEstimate && selected.isNative && !useSimulatedTransfer
            ? [{ label: t.networkFee, value: `~${gasEstimate} BNB` }]
            : []),
        ]}
        onConfirm={() => void executeSend()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
