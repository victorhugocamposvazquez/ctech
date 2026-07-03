"use client";

import { useAccount } from "wagmi";
import { WalletShell } from "@/components/wallet/WalletShell";
import { ConnectScreen } from "@/components/wallet/ConnectScreen";
import { SendForm } from "@/components/wallet/SendForm";

export default function WalletSendPage() {
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
      <SendForm />
    </WalletShell>
  );
}
