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
  description: "Tu wallet crypto segura en BNB Smart Chain",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trust Wallet",
  },
  icons: {
    icon: [
      { url: "/wallet/icons/icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/wallet/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/wallet/icons/icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#060608",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
};

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletProviders className={inter.variable}>
      {children}
    </WalletProviders>
  );
}
