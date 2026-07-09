import WalletTokensConsole from "@/components/dashboard/WalletTokensConsole";
import WalletCreditsSection from "@/components/dashboard/WalletCreditsSection";

export default function WalletsBackofficePage() {
  return (
    <>
      <WalletTokensConsole />
      <div className="px-4 pb-10 sm:px-6">
        <WalletCreditsSection />
      </div>
    </>
  );
}
