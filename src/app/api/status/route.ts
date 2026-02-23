import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/status — verifica que la configuración del sistema está completa.
 *
 * No expone valores de secretos, solo presencia.
 */
export async function GET() {
  const checks: Record<string, boolean> = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: !!process.env.CRON_SECRET,
    ARKHAM_API_KEY: !!process.env.ARKHAM_API_KEY,
  };

  let dbConnected = false;
  let tablesReady = false;
  let userAuthenticated = false;
  let riskStateExists = false;

  try {
    const supabase = await createClient();

    const { error: pingError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    dbConnected = !pingError;

    const tables = [
      "risk_state",
      "trades",
      "signal_outcomes",
      "tracked_wallets",
      "market_regimes",
      "token_registry",
    ];

    let allOk = true;
    for (const table of tables) {
      const { error } = await supabase.from(table).select("id").limit(1);
      if (error) {
        allOk = false;
        break;
      }
    }
    tablesReady = allOk;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    userAuthenticated = !!user;

    if (user) {
      const { data: riskRow } = await supabase
        .from("risk_state")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      riskStateExists = !!riskRow;
    }
  } catch {
    // DB no accesible
  }

  const allEnvs = checks.NEXT_PUBLIC_SUPABASE_URL &&
    checks.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    checks.SUPABASE_SERVICE_ROLE_KEY &&
    checks.CRON_SECRET;

  const ready = allEnvs && dbConnected && tablesReady && userAuthenticated;

  return NextResponse.json({
    ready,
    envs: checks,
    dbConnected,
    tablesReady,
    userAuthenticated,
    riskStateExists,
    nextSteps: buildNextSteps(checks, dbConnected, tablesReady, userAuthenticated, riskStateExists),
  });
}

function buildNextSteps(
  envs: Record<string, boolean>,
  db: boolean,
  tables: boolean,
  auth: boolean,
  risk: boolean
): string[] {
  const steps: string[] = [];

  if (!envs.NEXT_PUBLIC_SUPABASE_URL || !envs.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    steps.push("Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel.");
  }
  if (!envs.SUPABASE_SERVICE_ROLE_KEY) {
    steps.push("Configura SUPABASE_SERVICE_ROLE_KEY en Vercel (necesaria para crons).");
  }
  if (!envs.CRON_SECRET) {
    steps.push("Configura CRON_SECRET en Vercel (protege endpoints de cron).");
  }
  if (!db) {
    steps.push("Verifica la conexión con Supabase (URL/key incorrectos o proyecto inactivo).");
  }
  if (db && !tables) {
    steps.push("Ejecuta schema.sql en Supabase SQL Editor para crear las tablas.");
  }
  if (!auth) {
    steps.push("Inicia sesión en la app para activar tu usuario.");
  }
  if (auth && !risk) {
    steps.push("Ve a Simulación y haz click en 'Inicializar simulación' para crear tu estado de riesgo.");
  }
  if (steps.length === 0) {
    steps.push("Todo listo. Puedes ejecutar ciclos desde Simulación.");
  }

  return steps;
}
