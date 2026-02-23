import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RollingPerformanceEngine } from "@/lib/engine/rolling-performance";
import { CapitalScalingSimulator } from "@/lib/engine/capital-scaling";

/**
 * GET /api/simulation/capital-scaling
 *
 * Projects how edge, slippage, and pool saturation change
 * as portfolio capital scales from $500 to $1M.
 * Identifies optimal capital and breakeven point.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: riskState } = await supabase
    .from("risk_state")
    .select("capital")
    .eq("user_id", user.id)
    .single();

  const capital = Number(riskState?.capital ?? 10_000);

  const engine = new RollingPerformanceEngine(supabase);
  const rolling = await engine.compute(user.id, "30d");

  const report = CapitalScalingSimulator.analyze(capital, rolling);
  return NextResponse.json(report);
}
