import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SignalOutcomeTracker } from "@/lib/signals/signal-outcome-tracker";

/**
 * GET /api/validation — resumen de validación de señales.
 *
 * Devuelve hit rates, PnL medio por ventana temporal,
 * desglose por layer/régimen y señales recientes con outcomes.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const tracker = new SignalOutcomeTracker(supabase);
  const summary = await tracker.getValidationSummary(user.id);

  return NextResponse.json(summary);
}
