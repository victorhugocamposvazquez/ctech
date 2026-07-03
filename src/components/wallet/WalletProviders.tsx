"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { LocalWalletProvider } from "@/contexts/LocalWalletContext";
import { InstallPromptProvider } from "@/contexts/InstallPromptContext";
import { WalletThemeProvider } from "@/contexts/WalletThemeContext";
import { wagmiConfig } from "@/lib/wallet/config";
import { WalletAuthGate } from "@/components/wallet/WalletAuthGate";
import { AutoLockGuard } from "@/components/wallet/AutoLockGuard";
import { WalletServiceWorkerRegister } from "@/components/wallet/WalletServiceWorkerRegister";
import { PwaStorageSync } from "@/components/wallet/PwaStorageSync";
import { PwaUpdateBanner } from "@/components/wallet/PwaUpdateBanner";

export function WalletProviders({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
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
        <WalletThemeProvider className={className}>
          <InstallPromptProvider>
            <LocalWalletProvider>
              <WalletServiceWorkerRegister />
              <PwaUpdateBanner />
              <WalletAuthGate>
                <PwaStorageSync />
                <AutoLockGuard />
                {children}
              </WalletAuthGate>
            </LocalWalletProvider>
          </InstallPromptProvider>
        </WalletThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
