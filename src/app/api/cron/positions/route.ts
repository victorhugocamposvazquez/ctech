import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { manageOpenPositions } from "@/lib/engine/position-guardian";

export const maxDuration = 120;

/**
 * GET /api/cron/positions — monitor de posiciones de alta frecuencia.
 *
 * Invocado cada minuto por pg_cron (Supabase). Solo gestiona salidas
 * (stops, trailing, TPs, moonbags) de posiciones ya abiertas; la detección
 * y las entradas siguen en /api/cron/cycle cada 15 min.
 *
 * Razón: un stop-loss evaluado cada 15 min no es un stop-loss en tokens
 * que caen 70% en 5 minutos. Con resolución de 1 min, el paper trading se
 * acerca mucho más a lo que una ejecución real conseguiría.
 */
export async function GET(req: Request) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  // Solo usuarios con posiciones abiertas — la consulta barata primero
  const { data: openTrades } = await supabase
    .from("trades")
    .select("user_id")
    .eq("status", "open")
    .eq("execution_mode", "paper");

  const userIds = [...new Set((openTrades ?? []).map((t) => t.user_id as string))];

  if (!userIds.length) {
    return NextResponse.json({ message: "Sin posiciones abiertas", users: 0 });
  }

  const results = [];
  for (const userId of userIds) {
    try {
      const result = await manageOpenPositions(supabase, userId);
      results.push(result);
    } catch (err) {
      results.push({
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    users: userIds.length,
    results,
  });
}

function verifyCronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode sin secret → permitir

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}
