"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/wallet",
    label: "Wallet",
    icon: (active: boolean) => (
      <svg
        className="h-6 w-6"
        fill={active ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
      >
        {active ? (
          <path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v11A2.5 2.5 0 0117.5 20h-11A2.5 2.5 0 014 17.5v-11zM16 12.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5V18a2 2 0 01-2 2H5a2 2 0 01-2-2V7.5z"
          />
        )}
      </svg>
    ),
  },
  {
    href: "/wallet/swap",
    label: "Swap",
    icon: (active: boolean) => (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    ),
  },
  {
    href: "/wallet/send",
    label: "Enviar",
    icon: (active: boolean) => (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 19V5m0 0l-7 7m7-7l7 7"
        />
      </svg>
    ),
  },
  {
    href: "/wallet/receive",
    label: "Recibir",
    icon: (active: boolean) => (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 5v14m0 0l7-7m-7 7l-7-7"
        />
      </svg>
    ),
  },
  {
    href: "/wallet/settings",
    label: "Ajustes",
    icon: (active: boolean) => (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-wallet-border bg-wallet-surface/95 backdrop-blur-lg safe-bottom">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2 pb-1">
        {NAV.map(({ href, label, icon }) => {
          const active =
            href === "/wallet"
              ? pathname === "/wallet"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors ${
                active
                  ? "text-wallet-accent"
                  : "text-wallet-muted hover:text-wallet-text"
              }`}
            >
              {icon(active)}
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
