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

type SimulatedCredits = {
  byTokenId: Record<string, string>;
  byContract: Record<string, string>;
};

const emptyCredits: SimulatedCredits = { byTokenId: {}, byContract: {} };

const BALANCE_FETCH_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("balance-timeout")), ms);
    }),
  ]);
}

export async function fetchSimulatedCredits(address: string): Promise<SimulatedCredits> {
  try {
    const res = await fetch(
      `/api/wallet/credits?address=${encodeURIComponent(address)}`
    );
    const json = await res.json();
    if (!res.ok) return emptyCredits;
    return {
      byTokenId: json.balances ?? {},
      byContract: json.balancesByContract ?? {},
    };
  } catch {
    return emptyCredits;
  }
}

function getSimulatedRaw(
  token: WalletToken,
  credits: SimulatedCredits
): bigint {
  if (token.address) {
    const byContract = credits.byContract[token.address.toLowerCase()];
    if (byContract) return BigInt(byContract);
  }
  const byId = credits.byTokenId[token.id];
  return byId ? BigInt(byId) : 0n;
}

export interface PortfolioAsset {
  token: WalletToken;
  rawBalance: bigint;
  balance: number;
  usdPrice: number;
  usdValue: number;
  change24h: number | null;
}

export async function fetchLocalBalances(address: Address, tokens: WalletToken[]) {
  return withTimeout(fetchLocalBalancesInner(address, tokens), BALANCE_FETCH_TIMEOUT_MS);
}

async function fetchLocalBalancesInner(address: Address, tokens: WalletToken[]) {
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
  const { data: managedTokens, isLoading: tokensLoading } = useManagedTokens();
  const walletAddress = address ?? undefined;
  const tokens = getWalletTokens(managedTokens);
  const tokensKey = tokens.map((t) => t.id).join(",");
  const native = tokens.find((t) => t.isNative);
  const erc20s = tokens.filter((t) => t.address);

  const { data: externalNative, isLoading: extNativeLoading, isFetching: extNativeFetching } = useBalance({
    address: mode === "external" ? walletAddress : undefined,
    query: {
      enabled: mode === "external" && !!walletAddress,
      refetchOnMount: "always",
      staleTime: 0,
    },
  });

  const { data: externalErc20, isLoading: extErc20Loading, isFetching: extErc20Fetching } = useReadContracts({
    contracts: erc20s.map((t) => ({
      address: t.address!,
      abi: erc20BalanceAbi,
      functionName: "balanceOf" as const,
      args: [walletAddress as Address],
    })),
    query: {
      enabled: mode === "external" && !!walletAddress,
      refetchOnMount: "always",
      staleTime: 0,
    },
  });

  const {
    data: localData,
    isLoading: localLoading,
    isFetching: localFetching,
    isError: localError,
  } = useQuery({
    queryKey: ["local-balances", walletAddress, tokensKey],
    queryFn: () => fetchLocalBalances(walletAddress!, tokens),
    enabled: mode === "local" && !!walletAddress,
    refetchInterval: 30_000,
    refetchOnMount: "always",
    staleTime: 0,
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 4_000),
    networkMode: "always",
    placeholderData: (prev) => prev,
  });

  const {
    data: simulatedCredits = emptyCredits,
    isFetched: creditsFetched,
  } = useQuery({
    queryKey: ["wallet-simulated-credits", walletAddress],
    queryFn: () => fetchSimulatedCredits(walletAddress!),
    enabled: !!walletAddress,
    refetchInterval: 15_000,
    refetchOnMount: "always",
    staleTime: 0,
    retry: 2,
    networkMode: "always",
  });

  const {
    data: bnbMarket,
    isLoading: bnbLoading,
    isFetching: bnbFetching,
  } = useQuery({
    queryKey: ["bnb-usd"],
    queryFn: fetchBnbUsd,
    staleTime: 60_000,
    refetchOnMount: "always",
    retry: 2,
    networkMode: "always",
  });
  const bnbUsd = bnbMarket?.price ?? 0;
  const bnbChange = bnbMarket?.change24h ?? null;

  const pricedTokens = erc20s.filter((t) => t.dexScreener);

  const { data: customMarkets = {}, isLoading: customMarketsLoading } = useQuery({
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
    refetchOnMount: "always",
    retry: 1,
    networkMode: "always",
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

    raw += getSimulatedRaw(token, simulatedCredits);

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

  const balancesPending =
    mode === "local"
      ? localLoading || (!localData && localFetching)
      : mode === "external"
        ? extNativeLoading ||
          extErc20Loading ||
          (!externalNative && extNativeFetching) ||
          (!externalErc20 && extErc20Fetching)
        : !walletAddress;

  const creditsPending =
    !!walletAddress &&
    !creditsFetched &&
    (mode === "local"
      ? !!localData &&
        localData.nativeBal === 0n &&
        localData.erc20Bals.every((balance) => balance === 0n)
      : mode === "external"
        ? (externalNative?.value ?? 0n) === 0n &&
          (externalErc20?.every((r) => r.status !== "success" || (r.result as bigint) === 0n) ??
            true)
        : false);

  const nativeRaw =
    mode === "local" && localData
      ? localData.nativeBal
      : mode === "external" && externalNative
        ? externalNative.value
        : 0n;

  const needsBnbPrice = nativeRaw > 0n;
  const bnbPricePending = needsBnbPrice && (bnbLoading || (bnbFetching && !bnbMarket));

  const dexTokensWithBalance = pricedTokens.filter((token) => {
    const asset = assets.find((a) => a.token.id === token.id);
    return asset && asset.rawBalance > 0n;
  });
  const customPricesPending =
    dexTokensWithBalance.length > 0 &&
    customMarketsLoading &&
    dexTokensWithBalance.some((token) => !customMarkets[token.id]);

  const isLoading =
    tokensLoading ||
    balancesPending ||
    creditsPending ||
    bnbPricePending ||
    customPricesPending;

  const isError = mode === "local" ? localError : false;

  return { assets, totalUsd, isLoading, isError, isConnected, address, mode };
}
