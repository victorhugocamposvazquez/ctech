"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DashboardHeader({ userEmail }: { userEmail: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="h-16 shrink-0 border-b border-white/10 bg-[#0f183f]/70 backdrop-blur-xl flex items-center justify-between px-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Summary</p>
        <h2 className="text-sm font-semibold text-slate-200">Dashboard</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-300 shadow-[0_0_20px_rgba(56,189,248,0.35)]" />
        <span className="text-sm text-slate-300 truncate max-w-[220px]">
          {userEmail}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/10 transition"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
