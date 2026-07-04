"use client";

import { useQuery } from "@tanstack/react-query";
import { formatUnits, type Address } from "viem";
import { useBalance, useReadContracts } from "wagmi";
import { fetchBnbUsd, fetchTokenUsd } from "@/lib/wallet/prices";
import { getPublicClient } from "@/lib/wallet/public-client";
import {
  getWalletTokens,
  type WalletToken,
  erc20BalanceAbi,
} from "@/lib/wallet/tokens";
import { useManagedTokens } from "./useManagedTokens";
import { useWalletSession } from "./useWalletSession";

async function fetchSimulatedCredits(
  address: string
): Promise<Record<string, string>> {
  const res = await fetch(
    `/api/wallet/credits?address=${encodeURIComponent(address)}`
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Error al cargar créditos");
  return json.balances ?? {};
}

export interface PortfolioAsset {
  token: WalletToken;
  rawBalance: bigint;
  balance: number;
  usdPrice: number;
  usdValue: number;
  change24h: number | null;
}

async function fetchLocalBalances(address: Address, tokens: WalletToken[]) {
  const client = getPublicClient();
  const native = tokens.find((t) => t.isNative);
  const erc20s = tokens.filter((t) => t.address);

  const nativeBal = native
    ? await client.getBalance({ address })
    : 0n;

  const erc20Bals = await Promise.all(
    erc20s.map((t) =>
      client.readContract({
        address: t.address!,
        abi: erc20BalanceAbi,
        functionName: "balanceOf",
        args: [address],
      })
    )
  );

  return { nativeBal, erc20Bals, native, erc20s };
}

export function usePortfolio() {
  const { address, isConnected, mode } = useWalletSession();
  const { data: managedTokens } = useManagedTokens();
  const walletAddress = address ?? undefined;
  const tokens = getWalletTokens(managedTokens);
  const native = tokens.find((t) => t.isNative);
  const erc20s = tokens.filter((t) => t.address);

  const { data: externalNative, isLoading: extNativeLoading } = useBalance({
    address: mode === "external" ? walletAddress : undefined,
    query: { enabled: mode === "external" && !!walletAddress },
  });

  const { data: externalErc20, isLoading: extErc20Loading } = useReadContracts({
    contracts: erc20s.map((t) => ({
      address: t.address!,
      abi: erc20BalanceAbi,
      functionName: "balanceOf" as const,
      args: [walletAddress as Address],
    })),
    query: { enabled: mode === "external" && !!walletAddress },
  });

  const { data: localData, isLoading: localLoading, isError: localError } = useQuery({
    queryKey: ["local-balances", walletAddress],
    queryFn: () => fetchLocalBalances(walletAddress!, tokens),
    enabled: mode === "local" && !!walletAddress,
    refetchInterval: 30_000,
  });

  const { data: simulatedCredits = {} } = useQuery({
    queryKey: ["wallet-simulated-credits", walletAddress],
    queryFn: () => fetchSimulatedCredits(walletAddress!),
    enabled: !!walletAddress,
    refetchInterval: 15_000,
  });

  const { data: bnbMarket } = useQuery({
    queryKey: ["bnb-usd"],
    queryFn: fetchBnbUsd,
    staleTime: 60_000,
  });
  const bnbUsd = bnbMarket?.price ?? 0;
  const bnbChange = bnbMarket?.change24h ?? null;

  const pricedTokens = erc20s.filter((t) => t.dexScreener);

  const { data: customMarkets = {} } = useQuery({
    queryKey: ["token-usd-batch", pricedTokens.map((t) => t.address).join(",")],
    queryFn: async () => {
      const entries = await Promise.all(
        pricedTokens.map(async (token) => {
          const market = await fetchTokenUsd(token.address!);
          return [token.id, market] as const;
        })
      );
      return Object.fromEntries(entries);
    },
    enabled: pricedTokens.length > 0,
    staleTime: 60_000,
  });

  const assets: PortfolioAsset[] = [];

  if (mode === "external" && native && externalNative) {
    const balance = Number(formatUnits(externalNative.value, native.decimals));
    assets.push({
      token: native,
      rawBalance: externalNative.value,
      balance,
      usdPrice: bnbUsd,
      usdValue: balance * bnbUsd,
      change24h: bnbChange,
    });
  }

  if (mode === "local" && native && localData) {
    const balance = Number(
      formatUnits(localData.nativeBal, native.decimals)
    );
    assets.push({
      token: native,
      rawBalance: localData.nativeBal,
      balance,
      usdPrice: bnbUsd,
      usdValue: balance * bnbUsd,
      change24h: bnbChange,
    });
  }

  erc20s.forEach((token, i) => {
    let raw = 0n;
    if (mode === "external") {
      const result = externalErc20?.[i];
      raw = result?.status === "success" ? (result.result as bigint) : 0n;
    } else if (mode === "local" && localData) {
      raw = localData.erc20Bals[i] ?? 0n;
    }

    const simulatedRaw = simulatedCredits[token.id]
      ? BigInt(simulatedCredits[token.id])
      : 0n;
    raw += simulatedRaw;

    const balance = Number(formatUnits(raw, token.decimals));
    let usdPrice = token.fixedUsdPrice ?? 0;
    let change24h: number | null = token.fixedUsdPrice != null ? 0 : null;
    if (token.dexScreener) {
      const market = customMarkets[token.id];
      if (market) {
        usdPrice = market.price;
        change24h = market.change24h;
      }
    }

    assets.push({
      token,
      rawBalance: raw,
      balance,
      usdPrice,
      usdValue: balance * usdPrice,
      change24h,
    });
  });

  const totalUsd = assets.reduce((s, a) => s + a.usdValue, 0);
  const isLoading =
    mode === "external"
      ? extNativeLoading || extErc20Loading
      : mode === "local"
        ? localLoading
        : false;

  const isError = mode === "local" ? localError : false;

  return { assets, totalUsd, isLoading, isError, isConnected, address, mode };
}
