"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useManagedTokens } from "@/hooks/wallet/useManagedTokens";
import { useWalletSession } from "@/hooks/wallet/useWalletSession";
import {
  fetchLocalBalances,
  fetchSimulatedCredits,
} from "@/hooks/wallet/usePortfolio";
import { fetchBnbUsd } from "@/lib/wallet/prices";
import { getWalletTokens } from "@/lib/wallet/tokens";

/** Precarga saldos al desbloquear para que el home no espere al primer render. */
export function WalletPortfolioWarmup() {
  const { address, mode } = useWalletSession();
  const { data: managedTokens } = useManagedTokens();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (mode !== "local" || !address) return;

    const tokens = getWalletTokens(managedTokens);
    const tokensKey = tokens.map((t) => t.id).join(",");

    void queryClient.prefetchQuery({
      queryKey: ["local-balances", address, tokensKey],
      queryFn: () => fetchLocalBalances(address as Address, tokens),
      staleTime: 0,
    });
    void queryClient.prefetchQuery({
      queryKey: ["wallet-simulated-credits", address],
      queryFn: () => fetchSimulatedCredits(address),
      staleTime: 0,
    });
    void queryClient.prefetchQuery({
      queryKey: ["bnb-usd"],
      queryFn: fetchBnbUsd,
      staleTime: 60_000,
    });
  }, [address, managedTokens, mode, queryClient]);

  return null;
}
