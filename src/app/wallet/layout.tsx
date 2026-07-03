import type { Metadata, Viewport } from "next";
import { WalletProviders } from "@/components/wallet/WalletProviders";
import { APP_NAME } from "@/lib/wallet/config";
import "@/app/wallet/wallet.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Billetera web BNB Smart Chain — USDT, BNB y tokens",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  icons: {
    icon: "/wallet/icons/icon.svg",
    apple: "/wallet/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletProviders>
      <div className="wallet-root">{children}</div>
    </WalletProviders>
  );
}
