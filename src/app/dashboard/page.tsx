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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Resumen de señales, trades y estado del sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Señales hoy
          </h3>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {signalsToday}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Trades hoy
          </h3>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {tradesToday}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
            PnL acumulado
          </h3>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {pnlTotal.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Próximos pasos
        </h3>
        <ul className="mt-4 space-y-2 text-slate-600 dark:text-slate-400">
          <li>• Conectar un exchange (API) en Exchanges.</li>
          <li>• Revisar señales en Señales cuando haya datos configurados.</li>
          <li>• Ver historial en Trades.</li>
        </ul>
      </div>
    </div>
  );
}
