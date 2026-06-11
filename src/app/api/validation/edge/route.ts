import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EdgeValidator } from "@/lib/engine/edge-validator";

/**
 * GET /api/validation/edge — veredicto de edge de Fase 1.
 *
 * Calcula sobre trades limpios (post-Fase 0) la expectancia con IC 95%,
 * profit factor, win rate con IC de Wilson y un veredicto conservador:
 * insufficient_data | no_edge | inconclusive | promising | validated.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const validator = new EdgeValidator(supabase);
  const verdict = await validator.validate(user.id);

  return NextResponse.json(verdict);
}
