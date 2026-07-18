"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useWalletPortfolioRefresh() {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["local-balances"] }),
      queryClient.invalidateQueries({ queryKey: ["wallet-simulated-credits"] }),
      queryClient.invalidateQueries({ queryKey: ["wallet-managed-tokens"] }),
      queryClient.invalidateQueries({ queryKey: ["wallet-notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["bnb-usd"] }),
      queryClient.invalidateQueries({ queryKey: ["token-usd-batch"] }),
    ]);
  }, [queryClient]);
}
