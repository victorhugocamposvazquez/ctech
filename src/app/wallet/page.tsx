"use client";

import { useAccount } from "wagmi";
import { WalletShell } from "@/components/wallet/WalletShell";
import { ConnectScreen } from "@/components/wallet/ConnectScreen";
import { BalanceHeader } from "@/components/wallet/BalanceHeader";
import { TokenList } from "@/components/wallet/TokenList";
import { InstallBanner } from "@/components/wallet/InstallBanner";
import { usePortfolio } from "@/hooks/wallet/usePortfolio";

export default function WalletHomePage() {
  const { isConnected } = useAccount();
  const { assets, totalUsd, isLoading, address } = usePortfolio();

  if (!isConnected) {
    return (
      <WalletShell hideNav>
        <ConnectScreen />
      </WalletShell>
    );
  }

  return (
    <WalletShell>
      <InstallBanner />
      <BalanceHeader
        totalUsd={totalUsd}
        address={address}
        isLoading={isLoading}
      />
      <TokenList assets={assets} isLoading={isLoading} />
    </WalletShell>
  );
}
