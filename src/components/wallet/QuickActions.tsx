"use client";

import Link from "next/link";
import { t } from "@/lib/wallet/i18n";

const ACTIONS = [
  {
    href: "/wallet/send",
    label: t.send,
    icon: (
      <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
      </svg>
    ),
  },
  {
    href: "/wallet/receive",
    label: t.receive,
    icon: (
      <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l7-7m-7 7l-7-7" />
      </svg>
    ),
  },
  {
    href: "/wallet/swap",
    label: t.swap,
    icon: (
      <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
  },
  {
    href: "/wallet/buy",
    label: t.buy,
    icon: (
      <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

export function QuickActions() {
  return (
    <div className="flex justify-center gap-1 px-4 pb-8 pt-1">
      {ACTIONS.map(({ href, label, icon }) => (
        <Link key={label} href={href} className="wallet-action-btn">
          <span className="wallet-action-icon">{icon}</span>
          <span className="wallet-action-label">{label}</span>
        </Link>
      ))}
    </div>
  );
}
