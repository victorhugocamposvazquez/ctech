"use client";

import { useAccount } from "wagmi";
import { WalletShell } from "@/components/wallet/WalletShell";
import { ConnectScreen } from "@/components/wallet/ConnectScreen";
import { SendForm } from "@/components/wallet/SendForm";

export default function WalletSendPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <WalletShell title="Enviar" hideNav>
        <ConnectScreen />
      </WalletShell>
    );
  }

  return (
    <WalletShell title="Enviar">
      <SendForm />
    </WalletShell>
  );
}
