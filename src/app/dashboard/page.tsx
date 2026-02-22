export default function DashboardPage() {
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
            —
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Trades hoy
          </h3>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            —
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
            PnL acumulado
          </h3>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            —
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
