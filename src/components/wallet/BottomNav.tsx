"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/wallet/i18n";

const SIDE_NAV = [
  {
    href: "/wallet",
    label: t.navHome,
    match: (p: string) => p === "/wallet",
    icon: (active: boolean) => (
      <svg className="h-[22px] w-[22px]" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
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
    label: t.navTrending,
    match: (p: string) => p.startsWith("/wallet/trending"),
    icon: (active: boolean) => (
      <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

const SIDE_NAV_RIGHT = [
  {
    href: "/wallet/discover",
    label: t.navDiscover,
    match: (p: string) => p.startsWith("/wallet/discover"),
    icon: (active: boolean) => (
      <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    href: "/wallet/settings",
    label: t.navSettings,
    match: (p: string) => p.startsWith("/wallet/settings"),
    icon: (active: boolean) => (
      <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const swapActive = pathname.startsWith("/wallet/swap");

  return (
    <nav className="wallet-bottom-nav">
      <div className="wallet-bottom-nav-inner">
        {SIDE_NAV.map(({ href, label, icon, match }) => {
          const active = match(pathname);
          return (
            <Link key={href} href={href} className={`wallet-nav-item ${active ? "active" : ""}`}>
              {icon(active)}
              <span>{label}</span>
            </Link>
          );
        })}

        <Link href="/wallet/swap" className="wallet-nav-item">
          <span className={`wallet-nav-swap ${swapActive ? "" : "inactive"}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </span>
          <span className={swapActive ? "text-wallet-accent font-semibold" : ""}>{t.navSwap}</span>
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
