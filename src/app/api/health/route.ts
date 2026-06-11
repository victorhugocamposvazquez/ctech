import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Umbral: 3 ticks de 15 min sin ciclo = motor muerto. */
const STALE_AFTER_MINUTES = 45;

/**
 * GET /api/health — dead-man's switch del motor.
 *
 * Devuelve 200 si el último ciclo es reciente, 503 si el motor lleva
 * demasiado sin ejecutar (o nunca ejecutó). Pensado para vigilancia
 * externa (GitHub Actions horario): un 503 hace fallar el workflow y
 * GitHub avisa por email automáticamente.
 *
 * El motor estuvo muerto del 25-abr al 11-jun-2026 sin que nadie lo
 * supiera. Este endpoint existe para que eso no pueda repetirse.
 */
export async function GET() {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { status: "error", reason: err instanceof Error ? err.message : String(err) },
      { status: 503 }
    );
  }

  const { data: lastRun, error } = await supabase
    .from("cycle_runs")
    .select("timestamp")
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { status: "error", reason: error.message },
      { status: 503 }
    );
  }

  if (!lastRun) {
    return NextResponse.json(
      { status: "dead", reason: "Ningún ciclo registrado", lastCycleAt: null },
      { status: 503 }
    );
  }

  const ageMinutes = (Date.now() - new Date(lastRun.timestamp).getTime()) / 60_000;
  const stale = ageMinutes > STALE_AFTER_MINUTES;

  return NextResponse.json(
    {
      status: stale ? "stale" : "ok",
      lastCycleAt: lastRun.timestamp,
      ageMinutes: Math.round(ageMinutes * 10) / 10,
      thresholdMinutes: STALE_AFTER_MINUTES,
    },
    { status: stale ? 503 : 200 }
  );
}
