"use client";

import { useAccount } from "wagmi";
import { WalletShell } from "@/components/wallet/WalletShell";
import { ConnectScreen } from "@/components/wallet/ConnectScreen";
import { ReceiveScreen } from "@/components/wallet/ReceiveScreen";

export default function WalletReceivePage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <WalletShell title="Recibir" hideNav>
        <ConnectScreen />
      </WalletShell>
    );
  }

  return (
    <WalletShell title="Recibir">
      <ReceiveScreen />
    </WalletShell>
  );
}
