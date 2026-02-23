import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RollingPerformanceEngine } from "@/lib/engine/rolling-performance";
import { SensitivityMonitor } from "@/lib/engine/sensitivity-monitor";
import { IncrementalCalibrator } from "@/lib/signals/incremental-calibrator";

/**
 * GET /api/simulation/sensitivity
 *
 * Evaluates how ±5% and ±10% changes in key parameters
 * would affect rolling metrics. Returns sensitivity matrix
 * and identifies the most impactful parameter.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const engine = new RollingPerformanceEngine(supabase);
  const calibrator = new IncrementalCalibrator(supabase);

  const [rolling, calibration] = await Promise.all([
    engine.compute(user.id, "30d"),
    calibrator.getCurrentState(user.id),
  ]);

  if (!calibration) {
    return NextResponse.json(
      { error: "Sin datos de calibración. Ejecuta al menos un ciclo." },
      { status: 400 }
    );
  }

  const report = SensitivityMonitor.analyze(rolling, calibration);
  return NextResponse.json(report);
}
