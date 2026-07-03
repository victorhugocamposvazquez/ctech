"use client";

import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { WalletShell } from "@/components/wallet/WalletShell";
import { BalanceHeader } from "@/components/wallet/BalanceHeader";
import { TokenList } from "@/components/wallet/TokenList";
import { QuickActions } from "@/components/wallet/QuickActions";
import { AssetTabs } from "@/components/wallet/AssetTabs";
import { usePortfolio } from "@/hooks/wallet/usePortfolio";

export default function WalletHomePage() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const { assets, totalUsd, isLoading, isError, address: sessionAddress } = usePortfolio();

  const retry = () => {
    void queryClient.invalidateQueries({ queryKey: ["local-balances"] });
    void queryClient.invalidateQueries({ queryKey: ["bnb-usd"] });
  };

  return (
    <WalletShell address={sessionAddress ?? address} gradient>
      <BalanceHeader totalUsd={totalUsd} isLoading={isLoading} />
      <QuickActions />
      <AssetTabs>
        <TokenList assets={assets} isLoading={isLoading} isError={isError} onRetry={retry} />
      </AssetTabs>
    </WalletShell>
  );
}
