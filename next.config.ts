import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/wallet",
  sw: "wallet-sw.js",
  workboxOptions: {
    disableDevLogs: true,
    importScripts: ["/wallet-sw-bridge.js"],
  },
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.qrserver.com",
      },
    ],
  },
};

export default withPWA(nextConfig);
