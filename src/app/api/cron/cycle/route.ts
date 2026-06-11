import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Orchestrator } from "@/lib/signals/orchestrator";

/**
 * GET /api/cron/cycle — ejecutado por Vercel Cron cada 15 min.
 *
 * Protegido por CRON_SECRET en producción.
 * Ejecuta un ciclo del motor para TODOS los usuarios activos.
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

  // Guard de idempotencia: con dos schedulers redundantes (pg_cron principal
  // + GitHub Actions de respaldo) y reintentos del workflow, pueden llegar
  // disparos casi simultáneos. Si el último ciclo tiene <10 min, se ignora.
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  if (!force) {
    const { data: lastRun } = await supabase
      .from("cycle_runs")
      .select("timestamp")
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRun) {
      const ageMin = (Date.now() - new Date(lastRun.timestamp).getTime()) / 60_000;
      if (ageMin < 10) {
        return NextResponse.json({
          message: `Ciclo reciente hace ${ageMin.toFixed(1)} min — disparo ignorado (idempotencia)`,
          skipped: true,
          cycles: 0,
        });
      }
    }
  }

  const { data: users } = await supabase
    .from("risk_state")
    .select("user_id")
    .eq("is_paused", false);

  if (!users?.length) {
    return NextResponse.json({ message: "No hay usuarios activos", cycles: 0 });
  }

  const results = [];

  for (const { user_id } of users) {
    try {
      const orchestrator = new Orchestrator(supabase, user_id);
      const result = await orchestrator.runCycle();
      results.push({ userId: user_id, ...result });
    } catch (err) {
      results.push({
        userId: user_id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    usersProcessed: users.length,
    results,
  });
}

function verifyCronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode sin secret → permitir

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  return querySecret === secret;
}
