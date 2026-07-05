"use client";

import { WalletShell } from "@/components/wallet/WalletShell";
import { BalanceHeader } from "@/components/wallet/BalanceHeader";
import { TokenList } from "@/components/wallet/TokenList";
import { QuickActions } from "@/components/wallet/QuickActions";
import { AssetTabs } from "@/components/wallet/AssetTabs";
import { RecentTxList } from "@/components/wallet/RecentTxList";
import { usePortfolio } from "@/hooks/wallet/usePortfolio";
import { useTxHistory } from "@/hooks/wallet/useTxHistory";
import { useWalletPortfolioRefresh } from "@/hooks/wallet/useWalletPortfolioRefresh";

export default function WalletHomePage() {
  const { assets, totalUsd, isLoading, isError, address: sessionAddress } = usePortfolio();
  const txs = useTxHistory();
  const refresh = useWalletPortfolioRefresh();

  return (
    <WalletShell address={sessionAddress} gradient onPullRefresh={refresh}>
      <BalanceHeader totalUsd={totalUsd} isLoading={isLoading} onRefresh={refresh} />
      <QuickActions />
      <AssetTabs activity={<RecentTxList txs={txs} />}>
        <TokenList assets={assets} isLoading={isLoading} isError={isError} onRetry={refresh} />
      </AssetTabs>
    </WalletShell>
  );
}
