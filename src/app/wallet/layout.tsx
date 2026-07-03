import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { WalletProviders } from "@/components/wallet/WalletProviders";
import "@/app/wallet/wallet.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-trust",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trust Wallet",
  description: "The most trusted & secure crypto wallet",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trust Wallet",
  },
  icons: {
    icon: "/wallet/icons/icon.svg",
    apple: "/wallet/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#060608",
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
      <div className={`wallet-root ${inter.variable}`}>{children}</div>
    </WalletProviders>
  );
}
