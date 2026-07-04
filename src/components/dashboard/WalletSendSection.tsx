"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useAccount,
  useConnect,
  useReadContract,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
  WagmiProvider,
} from "wagmi";
import {
  encodeFunctionData,
  formatUnits,
  parseUnits,
  type Address,
} from "viem";
import { wagmiConfig, walletChain } from "@/lib/wallet/config";
import { erc20BalanceAbi } from "@/lib/wallet/tokens";
import { txExplorerUrl } from "@/lib/wallet/explorer";
import type { ManagedTokenRecord } from "@/lib/wallet/managed-tokens";
import type { RegisteredWalletRow } from "./WalletAddressesSection";

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function WalletSendPanel() {
  const [wallets, setWallets] = useState<RegisteredWalletRow[]>([]);
  const [tokens, setTokens] = useState<ManagedTokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletId, setWalletId] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successHash, setSuccessHash] = useState<string | null>(null);

  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connectPending } = useConnect();
  const { switchChain, isPending: switchPending } = useSwitchChain();
  const {
    sendTransaction,
    data: txHash,
    isPending: sendPending,
    error: sendError,
    reset: resetSend,
  } = useSendTransaction();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const activeTokens = useMemo(
    () => tokens.filter((t) => t.is_active),
    [tokens]
  );
  const selectedWallet = wallets.find((w) => w.id === walletId);
  const selectedToken = activeTokens.find((t) => t.id === tokenId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wRes, tRes] = await Promise.all([
        fetch("/api/backoffice/wallet-addresses"),
        fetch("/api/backoffice/wallet-tokens"),
      ]);
      const wJson = await wRes.json();
      const tJson = await tRes.json();
      if (!wRes.ok) throw new Error(wJson.error ?? "Error al cargar wallets");
      if (!tRes.ok) throw new Error(tJson.error ?? "Error al cargar tokens");

      setWallets(wJson.wallets ?? []);
      setTokens(tJson.tokens ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!walletId && wallets[0]) setWalletId(wallets[0].id);
  }, [wallets, walletId]);

  useEffect(() => {
    const firstActive = activeTokens[0];
    if (!tokenId && firstActive) setTokenId(firstActive.id);
  }, [activeTokens, tokenId]);

  const { data: tokenBalance } = useReadContract({
    address: selectedToken?.contract_address as Address | undefined,
    abi: erc20BalanceAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: walletChain.id,
    query: { enabled: Boolean(address && selectedToken) },
  });

  const parsedAmount =
    amount && !Number.isNaN(Number(amount)) && selectedToken
      ? parseUnits(amount, selectedToken.decimals)
      : 0n;

  const insufficientBalance =
    tokenBalance !== undefined && parsedAmount > 0n && parsedAmount > tokenBalance;

  const wrongChain = isConnected && chainId !== walletChain.id;

  const canSend =
    isConnected &&
    !wrongChain &&
    selectedWallet &&
    selectedToken &&
    parsedAmount > 0n &&
    !insufficientBalance;

  const isBusy = connectPending || switchPending || sendPending || confirming;

  const handleConnect = () => {
    const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
    if (injected) connect({ connector: injected, chainId: walletChain.id });
  };

  const handleSend = () => {
    if (!selectedWallet || !selectedToken || !canSend) return;
    setError(null);
    setSuccessHash(null);
    sendTransaction({
      to: selectedToken.contract_address as Address,
      data: encodeFunctionData({
        abi: erc20BalanceAbi,
        functionName: "transfer",
        args: [selectedWallet.wallet_address as Address, parsedAmount],
      }),
      chainId: walletChain.id,
    });
  };

  useEffect(() => {
    if (isSuccess && txHash) {
      setSuccessHash(txHash);
      setAmount("");
    }
  }, [isSuccess, txHash]);

  useEffect(() => {
    if (sendError) setError(sendError.message);
  }, [sendError]);

  const resetForm = () => {
    setSuccessHash(null);
    setAmount("");
    setError(null);
    resetSend();
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0b1230]/80 p-8 text-center text-sm text-slate-400">
        Cargando envío…
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0b1230]/80 p-8 text-center space-y-2">
        <h2 className="text-lg font-semibold text-white">Enviar tokens</h2>
        <p className="text-sm text-slate-400">
          Registra al menos una wallet destino arriba para poder enviar tokens desde
          MetaMask.
        </p>
      </div>
    );
  }

  if (activeTokens.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0b1230]/80 p-8 text-center space-y-2">
        <h2 className="text-lg font-semibold text-white">Enviar tokens</h2>
        <p className="text-sm text-slate-400">
          Activa al menos un token BEP-20 en la tabla de arriba antes de enviar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Enviar tokens</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Conecta MetaMask en BNB Smart Chain, elige la wallet destino y el token.
          La transferencia es real on-chain; la app PWA detectará el ingreso y
          mostrará la notificación.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {successHash && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100 space-y-2">
          <p className="font-medium">Transferencia enviada correctamente.</p>
          <a
            href={txExplorerUrl(successHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-cyan-300 underline break-all"
          >
            Ver en BscScan →
          </a>
          <button
            type="button"
            onClick={resetForm}
            className="mt-2 block rounded-lg border border-emerald-400/30 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-400/10"
          >
            Enviar otra
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-300">
            {isConnected ? (
              <>
                Conectado:{" "}
                <code className="text-cyan-200">{shorten(address!)}</code>
                {wrongChain && (
                  <span className="ml-2 text-amber-300">· red incorrecta</span>
                )}
              </>
            ) : (
              "MetaMask no conectado"
            )}
          </div>
          {!isConnected ? (
            <button
              type="button"
              disabled={connectPending}
              onClick={handleConnect}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {connectPending ? "Conectando…" : "Conectar MetaMask"}
            </button>
          ) : wrongChain ? (
            <button
              type="button"
              disabled={switchPending}
              onClick={() => switchChain({ chainId: walletChain.id })}
              className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm text-amber-100 disabled:opacity-50"
            >
              {switchPending ? "Cambiando red…" : `Cambiar a ${walletChain.name}`}
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-400">Wallet destino</span>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 text-white"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label || shorten(w.wallet_address)} — {shorten(w.wallet_address)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-slate-400">Token BEP-20</span>
            <select
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 text-white"
            >
              {activeTokens.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.symbol} — {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-400">Cantidad</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1230] px-3 py-2 text-lg font-semibold text-white"
            />
            {isConnected && selectedToken && tokenBalance !== undefined && (
              <p className="mt-2 text-xs text-slate-500">
                Disponible en MetaMask:{" "}
                {formatUnits(tokenBalance, selectedToken.decimals)} {selectedToken.symbol}
              </p>
            )}
            {insufficientBalance && (
              <p className="mt-1 text-xs text-red-300">Saldo insuficiente en MetaMask.</p>
            )}
          </label>
        </div>

        {selectedWallet && selectedToken && (
          <div className="rounded-xl border border-white/10 bg-[#0b1230]/60 p-4 text-xs text-slate-400 space-y-2">
            <p className="font-medium text-slate-300">Resumen</p>
            <div className="flex flex-wrap items-center gap-2">
              <span>Destino:</span>
              <code className="text-cyan-200/90 break-all">{selectedWallet.wallet_address}</code>
              <button
                type="button"
                onClick={() => void copyText(selectedWallet.wallet_address)}
                className="rounded border border-white/15 px-2 py-0.5 text-slate-300 hover:bg-white/5"
              >
                Copiar
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span>Contrato {selectedToken.symbol}:</span>
              <code className="text-cyan-200/90 break-all">{selectedToken.contract_address}</code>
              <button
                type="button"
                onClick={() => void copyText(selectedToken.contract_address)}
                className="rounded border border-white/15 px-2 py-0.5 text-slate-300 hover:bg-white/5"
              >
                Copiar
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!canSend || isBusy || !!successHash}
          onClick={handleSend}
          className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-[#041018] disabled:opacity-50 sm:w-auto"
        >
          {sendPending || confirming
            ? "Enviando…"
            : `Enviar ${selectedToken?.symbol ?? "token"} con MetaMask`}
        </button>
      </div>
    </div>
  );
}

export function WalletSendSection() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletSendPanel />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
