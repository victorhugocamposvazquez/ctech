"use client";

import { useAccount } from "wagmi";
import { WalletShell } from "@/components/wallet/WalletShell";
import { ConnectScreen } from "@/components/wallet/ConnectScreen";
import { BalanceHeader } from "@/components/wallet/BalanceHeader";
import { TokenList } from "@/components/wallet/TokenList";
import { QuickActions } from "@/components/wallet/QuickActions";
import { AssetTabs } from "@/components/wallet/AssetTabs";
import { usePortfolio } from "@/hooks/wallet/usePortfolio";

export default function WalletHomePage() {
  const { isConnected } = useAccount();
  const { assets, totalUsd, isLoading, address } = usePortfolio();

  if (!isConnected) {
    return (
      <WalletShell hideNav hideHeader gradient>
        <ConnectScreen />
      </WalletShell>
    );
  }

  return (
    <WalletShell address={address} gradient>
      <BalanceHeader totalUsd={totalUsd} isLoading={isLoading} />
      <QuickActions />
      <AssetTabs>
        <TokenList assets={assets} isLoading={isLoading} />
      </AssetTabs>
    </WalletShell>
  );
}
