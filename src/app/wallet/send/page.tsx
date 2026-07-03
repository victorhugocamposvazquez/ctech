"use client";

import { WalletShell } from "@/components/wallet/WalletShell";
import { SendForm } from "@/components/wallet/SendForm";
import { useWalletSession } from "@/hooks/wallet/useWalletSession";

export default function WalletSendPage() {
  const { address } = useWalletSession();

  return (
    <WalletShell address={address ?? undefined} hideNav gradient>
      <SendForm />
    </WalletShell>
  );
}
