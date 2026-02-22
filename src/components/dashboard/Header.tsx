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
    <header className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between px-6">
      <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">
        Dashboard
      </h2>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
          {userEmail}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
