"use client";

import { useQuery } from "@tanstack/react-query";
import { formatUnits, type Address } from "viem";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { fetchBnbUsd, fetchTokenUsd } from "@/lib/wallet/prices";
import {
  getWalletTokens,
  type WalletToken,
  erc20BalanceAbi,
} from "@/lib/wallet/tokens";

export interface PortfolioAsset {
  token: WalletToken;
  rawBalance: bigint;
  balance: number;
  usdPrice: number;
  usdValue: number;
}

export function usePortfolio() {
  const { address, isConnected } = useAccount();
  const tokens = getWalletTokens();
  const native = tokens.find((t) => t.isNative);
  const erc20s = tokens.filter((t) => t.address);

  const { data: nativeBalance, isLoading: nativeLoading } = useBalance({
    address,
    query: { enabled: isConnected && !!address },
  });

  const { data: erc20Balances, isLoading: erc20Loading } = useReadContracts({
    contracts: erc20s.map((t) => ({
      address: t.address!,
      abi: erc20BalanceAbi,
      functionName: "balanceOf" as const,
      args: [address as Address],
    })),
    query: { enabled: isConnected && !!address },
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

  if (native && nativeBalance) {
    const balance = Number(formatUnits(nativeBalance.value, native.decimals));
    assets.push({
      token: native,
      rawBalance: nativeBalance.value,
      balance,
      usdPrice: bnbUsd,
      usdValue: balance * bnbUsd,
    });
  }

  erc20s.forEach((token, i) => {
    const result = erc20Balances?.[i];
    const raw =
      result?.status === "success" ? (result.result as bigint) : 0n;
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

  return {
    assets,
    totalUsd,
    isLoading: nativeLoading || erc20Loading,
    isConnected,
    address,
  };
}
