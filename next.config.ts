import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const walletBuildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
  process.env.NEXT_PUBLIC_WALLET_BUILD_ID ??
  `local-${Date.now()}`;

try {
  mkdirSync(join(process.cwd(), "public/wallet"), { recursive: true });
  writeFileSync(
    join(process.cwd(), "public/wallet/version.json"),
    JSON.stringify({ v: walletBuildId })
  );
} catch {
  /* entorno sin FS */
}

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/wallet",
  sw: "wallet-sw.js",
  publicExcludes: ["!wallet/version.json"],
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: false,
    clientsClaim: true,
    importScripts: ["/wallet-sw-bridge.js"],
    exclude: [/version\.json$/],
  },
});

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_WALLET_BUILD_ID: walletBuildId,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.qrserver.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/wallet/version.json",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
