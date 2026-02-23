import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Orchestrator } from "@/lib/signals/orchestrator";

/**
 * POST /api/cycle — ejecuta un ciclo completo del motor:
 *
 *  1. Detectar régimen de mercado
 *  2. Escanear tokens con momentum (DexScreener)
 *  3. Evaluar salud de cada candidato
 *  4. ConfluenceEngine decide si operar
 *  5. RiskGate valida riesgo
 *  6. PaperBroker ejecuta
 *  7. PositionManager cierra trades que toque
 *
 * En producción será un cron. Por ahora se dispara manualmente.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const orchestrator = new Orchestrator(supabase, user.id);
  const result = await orchestrator.runCycle();

  return NextResponse.json(result);
}
