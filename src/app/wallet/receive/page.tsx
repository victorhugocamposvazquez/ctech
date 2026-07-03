"use client";

import { WalletShell } from "@/components/wallet/WalletShell";
import { ReceiveScreen } from "@/components/wallet/ReceiveScreen";
import { useWalletSession } from "@/hooks/wallet/useWalletSession";

export default function WalletReceivePage() {
  const { address } = useWalletSession();

  return (
    <WalletShell address={address ?? undefined} hideNav>
      <ReceiveScreen />
    </WalletShell>
  );
}
