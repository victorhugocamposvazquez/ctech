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
import { useWalletSession } from "./useWalletSession";

export interface PortfolioAsset {
  token: WalletToken;
  rawBalance: bigint;
  balance: number;
  usdPrice: number;
  usdValue: number;
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
  const walletAddress = address ?? undefined;
  const tokens = getWalletTokens();
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

  const { data: bnbUsd = 0 } = useQuery({
    queryKey: ["bnb-usd"],
    queryFn: fetchBnbUsd,
    staleTime: 60_000,
  });

  const customToken = erc20s.find((t) => t.dexScreener);
  const { data: customUsd = null } = useQuery({
    queryKey: ["token-usd", customToken?.address],
    queryFn: () => fetchTokenUsd(customToken!.address!),
    enabled: !!customToken?.address,
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

    const balance = Number(formatUnits(raw, token.decimals));
    let usdPrice = token.fixedUsdPrice ?? 0;
    if (token.dexScreener) usdPrice = customUsd ?? 0;

    assets.push({
      token,
      rawBalance: raw,
      balance,
      usdPrice,
      usdValue: balance * usdPrice,
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
