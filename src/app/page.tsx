import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          CTech
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Copy trading crypto con señales, ejecución y autoaprendizaje.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </main>
  );
}
