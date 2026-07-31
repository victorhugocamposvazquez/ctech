"use client";

import { useState } from "react";
import WalletTokensConsole from "@/components/dashboard/WalletTokensConsole";
import WalletCreditsSection from "@/components/dashboard/WalletCreditsSection";
import { WalletAddressesSection } from "@/components/dashboard/WalletAddressesSection";
import { WalletSimulatedHistorySection } from "@/components/dashboard/WalletSimulatedHistorySection";
import { WalletSendSection } from "@/components/dashboard/WalletSendSection";

export default function WalletsBackofficePage() {
  const [historyRefresh, setHistoryRefresh] = useState(0);

  return (
    <div className="space-y-10">
      <WalletTokensConsole />
      <WalletAddressesSection />
      <WalletSimulatedHistorySection refreshToken={historyRefresh} />
      <WalletSendSection onSent={() => setHistoryRefresh((n) => n + 1)} />
      <WalletCreditsSection />
    </div>
  );
}
