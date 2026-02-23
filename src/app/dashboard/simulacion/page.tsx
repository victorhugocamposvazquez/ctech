import SimulationConsole from "@/components/dashboard/SimulationConsole";

export default function SimulacionPage() {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Simulación</h1>
        <p className="mt-1 text-sm sm:text-base text-slate-300">
          Ejecuta ciclos, inicializa el entorno paper y revisa métricas/posiciones en
          tiempo real.
        </p>
      </div>

      <SimulationConsole />
    </div>
  );
}
