import WalletTokensConsole from "@/components/dashboard/WalletTokensConsole";
import { WalletAddressesSection } from "@/components/dashboard/WalletAddressesSection";
import { WalletSendSection } from "@/components/dashboard/WalletSendSection";

export default function WalletsBackofficePage() {
  return (
    <div className="space-y-10">
      <WalletTokensConsole />
      <WalletAddressesSection />
      <WalletSendSection />
    </div>
  );
}
