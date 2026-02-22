"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import logo from "../../../logo.png";

const nav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Señales", href: "/dashboard/senales" },
  { label: "Trades", href: "/dashboard/trades" },
  { label: "Exchanges", href: "/dashboard/exchanges" },
  { label: "Configuración", href: "/dashboard/config" },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 shrink-0 border-r border-white/10 bg-[#0b1230]/95 backdrop-blur-xl flex flex-col">
      <div className="p-6 border-b border-white/10">
        <Link href="/dashboard" className="inline-block">
          <Image src={logo} alt="CTech logo" width={170} className="h-auto" priority />
        </Link>
        <p className="text-xs text-slate-400 mt-1">
          Copy Trading
        </p>
      </div>
      <nav className="flex-1 p-4 space-y-1.5">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
              pathname === item.href
                ? "bg-gradient-to-r from-indigo-500/30 to-cyan-400/20 text-cyan-200 border border-cyan-300/30 shadow-[0_0_22px_rgba(56,189,248,0.22)]"
                : "text-slate-300 hover:bg-white/5 hover:text-white border border-transparent"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Estado</p>
          <p className="mt-1 text-sm text-cyan-200">Sistema activo</p>
        </div>
      </div>
    </aside>
  );
}
