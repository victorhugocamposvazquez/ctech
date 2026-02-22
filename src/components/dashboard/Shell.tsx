"use client";

import { useState } from "react";
import DashboardHeader from "@/components/dashboard/Header";
import DashboardSidebar from "@/components/dashboard/Sidebar";

type DashboardShellProps = {
  userEmail: string;
  children: React.ReactNode;
};

export default function DashboardShell({ userEmail, children }: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#070b1f] text-slate-100 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl" />

      <DashboardSidebar className="hidden md:flex md:w-72 md:shrink-0" />

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 md:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <DashboardSidebar
          className="h-full w-full"
          onNavigate={() => setMenuOpen(false)}
        />
      </div>

      {menuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <DashboardHeader
          userEmail={userEmail}
          onMenuClick={() => setMenuOpen(true)}
        />
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
