"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SIDE_NAV = [
  {
    href: "/wallet",
    label: "Home",
    match: (p: string) => p === "/wallet",
    icon: (active: boolean) => (
      <svg className="h-6 w-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.6}>
        {active ? (
          <path d="M12 2.5L3 9v11a1 1 0 001 1h6v-6h4v6h6a1 1 0 001-1V9L12 2.5z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-7 9 7M5 10v10h5v-6h4v6h5V10" />
        )}
      </svg>
    ),
  },
  {
    href: "/wallet/trending",
    label: "Trending",
    match: (p: string) => p.startsWith("/wallet/trending"),
    icon: (active: boolean) => (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

const SIDE_NAV_RIGHT = [
  {
    href: "/wallet/earn",
    label: "Earn",
    match: (p: string) => p.startsWith("/wallet/earn"),
    icon: (active: boolean) => (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/wallet/discover",
    label: "Discover",
    match: (p: string) => p.startsWith("/wallet/discover"),
    icon: (active: boolean) => (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const swapActive = pathname.startsWith("/wallet/swap");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-wallet-border bg-wallet-surface safe-bottom">
      <div className="mx-auto flex max-w-lg items-end justify-around px-2 pb-1 pt-1">
        {SIDE_NAV.map(({ href, label, icon, match }) => {
          const active = match(pathname);
          return (
            <Link key={href} href={href} className={`wallet-nav-item ${active ? "active" : ""}`}>
              {icon(active)}
              <span>{label}</span>
            </Link>
          );
        })}

        <Link href="/wallet/swap" className="wallet-nav-item mb-1">
          <span className={`wallet-nav-swap ${swapActive ? "" : "inactive"}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </span>
          <span className={swapActive ? "text-wallet-accent" : ""}>Swap</span>
        </Link>

        {SIDE_NAV_RIGHT.map(({ href, label, icon, match }) => {
          const active = match(pathname);
          return (
            <Link key={href} href={href} className={`wallet-nav-item ${active ? "active" : ""}`}>
              {icon(active)}
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
