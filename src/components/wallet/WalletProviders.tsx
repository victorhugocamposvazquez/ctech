"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { LocalWalletProvider } from "@/contexts/LocalWalletContext";
import { wagmiConfig } from "@/lib/wallet/config";
import { WalletAuthGate } from "@/components/wallet/WalletAuthGate";

export function WalletProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchInterval: 30_000,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <LocalWalletProvider>
          <WalletAuthGate>{children}</WalletAuthGate>
        </LocalWalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
