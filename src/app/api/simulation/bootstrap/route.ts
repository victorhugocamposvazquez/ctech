import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Orchestrator } from "@/lib/signals/orchestrator";

type WalletInput = {
  address: string;
  network?: string;
  label?: string;
  category?: "alpha" | "momentum" | "early" | "lp_arb" | "swing" | "unknown";
  source?: "arkham" | "manual";
  notes?: string;
};

/**
 * POST /api/simulation/bootstrap
 *
 * Inicializa todo lo necesario para empezar paper trading:
 *  - crea o resetea risk_state
 *  - opcionalmente registra wallets iniciales
 *  - opcionalmente ejecuta un primer ciclo del motor
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    initialCapital?: number;
    resetState?: boolean;
    runFirstCycle?: boolean;
    trackedWallets?: WalletInput[];
  } = {};

  try {
    body = await req.json();
  } catch {
    // payload opcional
  }

  const initialCapital = Number(body.initialCapital ?? 10_000);
  const resetState = body.resetState ?? true;
  const runFirstCycle = body.runFirstCycle ?? true;
  const trackedWallets = Array.isArray(body.trackedWallets) ? body.trackedWallets : [];

  if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
    return NextResponse.json(
      { error: "initialCapital debe ser un número > 0" },
      { status: 400 }
    );
  }

  if (resetState) {
    const { error: riskError } = await supabase.from("risk_state").upsert(
      {
        user_id: user.id,
        capital: initialCapital,
        pnl_today: 0,
        pnl_this_week: 0,
        trades_today_core: 0,
        trades_today_satellite: 0,
        consecutive_losses_satellite: 0,
        is_paused: false,
        pause_reason: null,
        pause_until: null,
      },
      { onConflict: "user_id" }
    );

    if (riskError) {
      return NextResponse.json({ error: riskError.message }, { status: 500 });
    }
  } else {
    // Si no resetea, al menos garantizar que exista estado inicial.
    const { data: riskRow, error: riskReadError } = await supabase
      .from("risk_state")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (riskReadError) {
      return NextResponse.json({ error: riskReadError.message }, { status: 500 });
    }

    if (!riskRow) {
      const { error: riskInsertError } = await supabase.from("risk_state").insert({
        user_id: user.id,
        capital: initialCapital,
      });
      if (riskInsertError) {
        return NextResponse.json({ error: riskInsertError.message }, { status: 500 });
      }
    }
  }

  const validCategories = ["alpha", "momentum", "early", "lp_arb", "swing", "unknown"] as const;
  let walletsUpserted = 0;

  for (const wallet of trackedWallets) {
    const address = String(wallet.address ?? "").trim().toLowerCase();
    if (!address) continue;

    const network = String(wallet.network ?? "ethereum").trim().toLowerCase();
    const category = validCategories.includes(
      (wallet.category ?? "unknown") as (typeof validCategories)[number]
    )
      ? (wallet.category ?? "unknown")
      : "unknown";

    const { error: walletError } = await supabase
      .from("tracked_wallets")
      .upsert(
        {
          user_id: user.id,
          address,
          network,
          label: wallet.label?.trim() || null,
          category,
          source: wallet.source ?? "manual",
          notes: wallet.notes?.trim() || null,
          is_active: true,
        },
        { onConflict: "user_id,address,network" }
      );

    if (!walletError) {
      walletsUpserted += 1;
    }
  }

  let firstCycle: Awaited<ReturnType<Orchestrator["runCycle"]>> | null = null;
  if (runFirstCycle) {
    const orchestrator = new Orchestrator(supabase, user.id);
    firstCycle = await orchestrator.runCycle();
  }

  return NextResponse.json({
    ok: true,
    userId: user.id,
    simulationReady: true,
    initialCapital,
    stateReset: resetState,
    walletsUpserted,
    firstCycleExecuted: runFirstCycle,
    firstCycle,
    nextSteps: [
      "Invocar POST /api/cycle manualmente o esperar scheduler automático.",
      "Consultar GET /api/positions y GET /api/performance para monitorizar resultados.",
    ],
  });
}
