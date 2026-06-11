import ValidationConsole from "@/components/dashboard/ValidationConsole";
import EdgeVerdictPanel from "@/components/dashboard/EdgeVerdictPanel";
import SignalDecayPanel from "@/components/dashboard/SignalDecayPanel";
import ReplayPanel from "@/components/dashboard/ReplayPanel";
import ShortfallPanel from "@/components/dashboard/ShortfallPanel";

export default function ValidacionPage() {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          Validación de Señales
        </h1>
        <p className="mt-1 text-sm sm:text-base text-slate-300">
          Mide si las señales que genera el sistema realmente predicen
          movimientos de precio. El dato más importante para saber si el motor
          funciona.
        </p>
      </div>
      <EdgeVerdictPanel />
      <ReplayPanel />
      <ShortfallPanel />
      <SignalDecayPanel />
      <ValidationConsole />
    </div>
  );
}
