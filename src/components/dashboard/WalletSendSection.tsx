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

type SendMode = "manual" | "metamask";

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function CopyButton({
  label,
  value,
  copiedKey,
  copyKey,
  onCopy,
}: {
  label: string;
  value: string;
  copiedKey: string | null;
  copyKey: string;
  onCopy: (key: string, text: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <span className="shrink-0 text-slate-500">{label}</span>
      <code className="flex-1 text-cyan-200/90 break-all">{value}</code>
      <button
        type="button"
        onClick={() => onCopy(copyKey, value)}
        className="shrink-0 rounded border border-white/15 px-2 py-0.5 text-slate-300 hover:bg-white/5"
      >
        {copiedKey === copyKey ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function ManualSendGuide({
  wallet,
  token,
  amount,
  onCopy,
  copiedKey,
}: {
  wallet: RegisteredWalletRow;
  token: ManagedTokenRecord;
  amount: string;
  onCopy: (key: string, text: string) => void;
  copiedKey: string | null;
}) {
  const summary = [
    `Enviar ${token.symbol} (BEP-20) en ${walletChain.name}`,
    "",
    `Token: ${token.symbol} (${token.name})`,
    `Contrato: ${token.contract_address}`,
    `Destino: ${wallet.wallet_address}`,
    `Cantidad: ${amount}`,
    "",
    "Pasos:",
    "1. Abre tu wallet (MetaMask, Trust Wallet, etc.) en BNB Smart Chain",
    "2. Enviar → elige el token o pega la dirección del contrato",
    "3. Pega la dirección destino y la cantidad indicadas arriba",
    "4. Confirma la transacción",
  ].join("\n");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100/90">
        Envía desde cualquier wallet externa (app móvil, hardware wallet, etc.).
        No hace falta conectar MetaMask en este navegador.
      </div>

      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-400">
        <li>Abre tu wallet en <strong className="text-slate-300">BNB Smart Chain</strong></li>
        <li>Elige <strong className="text-slate-300">Enviar</strong> el token {token.symbol}</li>
        <li>Si no lo tienes en la lista, importa el token con la dirección del contrato</li>
        <li>Pega la dirección destino y confirma la cantidad</li>
      </ol>

      <div className="rounded-xl border border-white/10 bg-[#0b1230]/60 p-4 text-xs space-y-3">
        <CopyButton
          label="Destino"
          value={wallet.wallet_address}
          copiedKey={copiedKey}
          copyKey="dest"
          onCopy={onCopy}
        />
        <CopyButton
          label={`Contrato ${token.symbol}`}
          value={token.contract_address}
          copiedKey={copiedKey}
          copyKey="contract"
          onCopy={onCopy}
        />
        <CopyButton
          label="Cantidad"
          value={amount}
          copiedKey={copiedKey}
          copyKey="amount"
          onCopy={onCopy}
        />
      </div>

      <button
        type="button"
        onClick={() => onCopy("all", summary)}
        className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100 hover:bg-cyan-400/20"
      >
        {copiedKey === "all" ? "Datos copiados" : "Copiar todos los datos de envío"}
      </button>
    </div>
  );
}

function MetaMaskSendActions({
  selectedWallet,
  selectedToken,
  amount,
  parsedAmount,
  successHash,
  onSuccess,
  onError,
}: {
  selectedWallet: RegisteredWalletRow;
  selectedToken: ManagedTokenRecord;
  amount: string;
  parsedAmount: bigint;
  successHash: string | null;
  onSuccess: (hash: string) => void;
  onError: (message: string) => void;
}) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connectPending } = useConnect();
  const { switchChain, isPending: switchPending } = useSwitchChain();
  const {
    sendTransaction,
    data: txHash,
    isPending: sendPending,
    error: sendError,
  } = useSendTransaction();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const { data: tokenBalance } = useReadContract({
    address: selectedToken.contract_address as Address,
    abi: erc20BalanceAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: walletChain.id,
    query: { enabled: Boolean(address) },
  });

  const insufficientBalance =
    tokenBalance !== undefined && parsedAmount > 0n && parsedAmount > tokenBalance;
  const wrongChain = isConnected && chainId !== walletChain.id;
  const canSend =
    isConnected &&
    !wrongChain &&
    parsedAmount > 0n &&
    !insufficientBalance;

  const isBusy = connectPending || switchPending || sendPending || confirming;

  const handleConnect = () => {
    const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
    if (injected) connect({ connector: injected, chainId: walletChain.id });
  };

  const handleSend = () => {
    if (!canSend) return;
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
    if (isSuccess && txHash) onSuccess(txHash);
  }, [isSuccess, txHash, onSuccess]);

  useEffect(() => {
    if (sendError) onError(sendError.message);
  }, [sendError, onError]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-300">
          {isConnected ? (
            <>
              Conectado: <code className="text-cyan-200">{shorten(address!)}</code>
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

      {isConnected && tokenBalance !== undefined && (
        <p className="text-xs text-slate-500">
          Disponible en MetaMask:{" "}
          {formatUnits(tokenBalance, selectedToken.decimals)} {selectedToken.symbol}
        </p>
      )}
      {insufficientBalance && (
        <p className="text-xs text-red-300">Saldo insuficiente en MetaMask.</p>
      )}

      <button
        type="button"
        disabled={!canSend || isBusy || !!successHash}
        onClick={handleSend}
        className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-[#041018] disabled:opacity-50 sm:w-auto"
      >
        {sendPending || confirming
          ? "Enviando…"
          : `Enviar ${selectedToken.symbol} con MetaMask`}
      </button>
    </div>
  );
}

function WalletSendPanel() {
  const [wallets, setWallets] = useState<RegisteredWalletRow[]>([]);
  const [tokens, setTokens] = useState<ManagedTokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletId, setWalletId] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [amount, setAmount] = useState("");
  const [sendMode, setSendMode] = useState<SendMode>("manual");
  const [error, setError] = useState<string | null>(null);
  const [successHash, setSuccessHash] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeTokens = useMemo(
    () => tokens.filter((t) => t.is_active),
    [tokens]
  );
  const selectedWallet = wallets.find((w) => w.id === walletId);
  const selectedToken = activeTokens.find((t) => t.id === tokenId);

  const parsedAmount =
    amount && !Number.isNaN(Number(amount)) && selectedToken
      ? parseUnits(amount, selectedToken.decimals)
      : 0n;

  const manualReady = Boolean(
    selectedWallet && selectedToken && amount.trim() && parsedAmount > 0n
  );

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

  const handleCopy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleMetaSuccess = useCallback((hash: string) => {
    setSuccessHash(hash);
    setAmount("");
  }, []);

  const handleMetaError = useCallback((message: string) => {
    setError(message);
  }, []);

  const resetForm = () => {
    setSuccessHash(null);
    setAmount("");
    setError(null);
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
          Registra al menos una wallet destino arriba para poder enviar tokens.
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
          Elige wallet destino y token. Puedes enviar desde tu wallet externa
          (modo manual) o conectar MetaMask en este navegador.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {successHash && sendMode === "metamask" && (
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSendMode("manual");
              setError(null);
              setSuccessHash(null);
            }}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              sendMode === "manual"
                ? "bg-cyan-500 text-[#041018]"
                : "border border-white/15 text-slate-300 hover:bg-white/5"
            }`}
          >
            Wallet externa (sin conectar)
          </button>
          <button
            type="button"
            onClick={() => {
              setSendMode("metamask");
              setError(null);
            }}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              sendMode === "metamask"
                ? "bg-cyan-500 text-[#041018]"
                : "border border-white/15 text-slate-300 hover:bg-white/5"
            }`}
          >
            MetaMask en el navegador
          </button>
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
          </label>
        </div>

        {selectedWallet && selectedToken && sendMode === "manual" && (
          manualReady ? (
            <ManualSendGuide
              wallet={selectedWallet}
              token={selectedToken}
              amount={amount}
              onCopy={(key, text) => void handleCopy(key, text)}
              copiedKey={copiedKey}
            />
          ) : (
            <p className="text-sm text-slate-500">
              Introduce una cantidad válida para ver los datos de envío.
            </p>
          )
        )}

        {selectedWallet && selectedToken && sendMode === "metamask" && (
          <MetaMaskSendActions
            selectedWallet={selectedWallet}
            selectedToken={selectedToken}
            amount={amount}
            parsedAmount={parsedAmount}
            successHash={successHash}
            onSuccess={handleMetaSuccess}
            onError={handleMetaError}
          />
        )}
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
