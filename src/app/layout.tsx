import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CTech - Copy Trading Crypto",
  description: "Sistema de copy trading con señales y autoaprendizaje",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
