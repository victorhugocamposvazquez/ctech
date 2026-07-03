"use client";

import { useAccount } from "wagmi";
import { WalletShell } from "@/components/wallet/WalletShell";
import { ConnectScreen } from "@/components/wallet/ConnectScreen";
import { ReceiveScreen } from "@/components/wallet/ReceiveScreen";

export default function WalletReceivePage() {
  const { isConnected, address } = useAccount();

  if (!isConnected) {
    return (
      <WalletShell hideNav hideHeader gradient>
        <ConnectScreen />
      </WalletShell>
    );
  }

  return (
    <WalletShell address={address} hideNav>
      <ReceiveScreen />
    </WalletShell>
  );
}
