import WalletTokensConsole from "@/components/dashboard/WalletTokensConsole";
import { WalletAddressesSection } from "@/components/dashboard/WalletAddressesSection";

export default function WalletsBackofficePage() {
  return (
    <div className="space-y-10">
      <WalletTokensConsole />
      <WalletAddressesSection />
    </div>
  );
}
