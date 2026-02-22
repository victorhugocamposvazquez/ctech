import { createClient } from "@/lib/supabase/server";

function startOfTodayIso() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const todayIso = startOfTodayIso();

  const [signalsResult, tradesResult, pnlResult] = await Promise.all([
    supabase
      .from("signals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user?.id ?? "")
      .gte("generated_at", todayIso),
    supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user?.id ?? "")
      .gte("opened_at", todayIso),
    supabase
      .from("trades")
      .select("pnl_abs")
      .eq("user_id", user?.id ?? "")
      .not("pnl_abs", "is", null),
  ]);

  const signalsToday = signalsResult.count ?? 0;
  const tradesToday = tradesResult.count ?? 0;
  const pnlTotal =
    pnlResult.data?.reduce((acc, row) => acc + Number(row.pnl_abs ?? 0), 0) ?? 0;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-slate-300">
          Resumen de señales, trades y estado del sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#1a234f]/90 p-6 shadow-[0_18px_40px_rgba(6,8,25,0.45)]">
          <h3 className="text-sm font-medium text-slate-300">
            Señales hoy
          </h3>
          <p className="mt-2 text-4xl font-semibold text-white">
            {signalsToday}
          </p>
        </div>
        <div className="rounded-2xl border border-indigo-300/25 bg-gradient-to-r from-blue-600/70 to-indigo-500/70 p-6 shadow-[0_18px_45px_rgba(59,130,246,0.35)]">
          <h3 className="text-sm font-medium text-indigo-100">
            Trades hoy
          </h3>
          <p className="mt-2 text-4xl font-semibold text-white">
            {tradesToday}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#1a234f]/90 p-6 shadow-[0_18px_40px_rgba(6,8,25,0.45)]">
          <h3 className="text-sm font-medium text-slate-300">
            PnL acumulado
          </h3>
          <p className={`mt-2 text-4xl font-semibold ${pnlTotal >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {pnlTotal.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-[#131b43]/90 p-6 shadow-[0_18px_40px_rgba(6,8,25,0.45)]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">Alert Chart</h3>
            <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
              Live mode
            </span>
          </div>
          <div className="mt-5 h-52 rounded-xl border border-white/10 bg-gradient-to-b from-[#1f2a63] to-[#0f1538] p-4 flex items-end">
            <div className="relative h-full w-full">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:28px_28px]" />
              <svg viewBox="0 0 500 180" className="absolute inset-0 h-full w-full">
                <path
                  d="M0 125 C 50 85, 90 165, 140 120 C 190 80, 230 140, 280 75 C 320 40, 360 135, 410 105 C 440 86, 470 95, 500 90"
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#131b43]/90 p-6 shadow-[0_18px_40px_rgba(6,8,25,0.45)]">
          <h3 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">
            Próximos pasos
          </h3>
          <ul className="mt-4 space-y-3 text-slate-300 text-sm">
            <li>• Conectar un exchange (API) en Exchanges.</li>
            <li>• Revisar señales en Señales cuando haya datos configurados.</li>
            <li>• Ver historial en Trades.</li>
          </ul>
          <div className="mt-6 rounded-xl border border-cyan-300/25 bg-cyan-400/10 p-3">
            <p className="text-xs uppercase tracking-wide text-cyan-200">Siguiente hito</p>
            <p className="mt-1 text-sm text-cyan-100">Activar ejecución automática por señal.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
