import SecurityLabConsole from "@/components/dashboard/labs/SecurityLabConsole";

export default function LabsPage() {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Laboratorios de Seguridad</h1>
        <p className="mt-1 text-sm sm:text-base text-slate-300">
          Simulaciones controladas para concienciar sobre estafas crypto.
          Flash USDT en Tron: los tokens se suman automáticamente al total USDT de tu wallet.
        </p>
      </div>

      <SecurityLabConsole />
    </div>
  );
}
