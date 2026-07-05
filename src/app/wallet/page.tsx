"use client";

import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { WalletShell } from "@/components/wallet/WalletShell";
import { BalanceHeader } from "@/components/wallet/BalanceHeader";
import { TokenList } from "@/components/wallet/TokenList";
import { QuickActions } from "@/components/wallet/QuickActions";
import { AssetTabs } from "@/components/wallet/AssetTabs";
import { RecentTxList } from "@/components/wallet/RecentTxList";
import { usePortfolio } from "@/hooks/wallet/usePortfolio";
import { useTxHistory } from "@/hooks/wallet/useTxHistory";

export default function WalletHomePage() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const { assets, totalUsd, isLoading, isError, address: sessionAddress } = usePortfolio();
  const txs = useTxHistory();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["local-balances"] });
    void queryClient.invalidateQueries({ queryKey: ["wallet-simulated-credits"] });
    void queryClient.invalidateQueries({ queryKey: ["wallet-notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["bnb-usd"] });
    void queryClient.invalidateQueries({ queryKey: ["token-usd-batch"] });
  };

  return (
    <WalletShell address={sessionAddress ?? address} gradient>
      <BalanceHeader totalUsd={totalUsd} isLoading={isLoading} onRefresh={refresh} />
      <QuickActions />
      <div className="wallet-home-stack">
        <AssetTabs activity={<RecentTxList txs={txs} />}>
          <TokenList assets={assets} isLoading={isLoading} isError={isError} onRetry={refresh} />
        </AssetTabs>
      </div>
    </WalletShell>
  );
}
