import Link from "next/link";

const nav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Señales", href: "/dashboard/senales" },
  { label: "Trades", href: "/dashboard/trades" },
  { label: "Exchanges", href: "/dashboard/exchanges" },
  { label: "Configuración", href: "/dashboard/config" },
];

export default function DashboardSidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <Link href="/dashboard" className="text-xl font-bold text-slate-900 dark:text-white">
          CTech
        </Link>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Copy Trading
        </p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
