import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import "./landing.css";

const manrope = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-twc",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trust Wallet Cloud — The most decentralized wallet",
  description:
    "Trust Wallet Cloud is the most decentralized version of the wallet. Self-custody in the cloud — your keys stay yours.",
  metadataBase: new URL("https://trustwalletcloud.com"),
  openGraph: {
    title: "Trust Wallet Cloud",
    description:
      "The most decentralized version of the wallet. Self-custody in the cloud.",
    url: "https://trustwalletcloud.com",
    siteName: "Trust Wallet Cloud",
    type: "website",
  },
  icons: {
    icon: "/wallet/icons/icon-192.png",
    apple: "/wallet/icons/icon-180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
