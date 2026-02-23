import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { StressEventSimulator } from "@/lib/engine/stress-events";

/**
 * POST /api/simulation/stress-test
 *
 * Runs deterministic stress scenarios against the current portfolio.
 * Returns impact analysis for each event type at multiple severities.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: riskState } = await supabase
    .from("risk_state")
    .select("capital, pnl_today, pnl_this_week")
    .eq("user_id", user.id)
    .single();

  const capital = Number(riskState?.capital ?? 10_000);
  const pnlToday = Number(riskState?.pnl_today ?? 0);
  const pnlThisWeek = Number(riskState?.pnl_this_week ?? 0);

  const { data: openTrades } = await supabase
    .from("trades")
    .select("layer, quantity, entry_price, metadata")
    .eq("user_id", user.id)
    .eq("status", "open")
    .eq("execution_mode", "paper");

  const positions = (openTrades ?? []).map((t) => ({
    positionUsd: Number(t.quantity ?? 0) * Number(t.entry_price ?? 0),
    layer: (t.layer as "core" | "satellite") ?? "core",
    liquidityUsd: Number((t.metadata as Record<string, unknown>)?.entryLiquidity ?? 200_000),
    network: String((t.metadata as Record<string, unknown>)?.network ?? "ethereum"),
  }));

  if (positions.length === 0) {
    positions.push({
      positionUsd: capital * 0.005,
      layer: "core",
      liquidityUsd: 200_000,
      network: "ethereum",
    });
  }

  const results = positions.map((pos) =>
    StressEventSimulator.runStressTest({
      positionUsd: pos.positionUsd,
      capitalUsd: capital,
      liquidityUsd: pos.liquidityUsd,
      network: pos.network,
      layer: pos.layer,
      pnlToday,
      pnlThisWeek,
    })
  );

  const combined = {
    positionsAnalyzed: positions.length,
    capital,
    results,
    aggregated: {
      avgLossPct: avg(results.map((r) => r.summary.avgLossPct)),
      maxLossPct: Math.max(...results.map((r) => r.summary.maxLossPct)),
      avgSurvivalRate: avg(results.map((r) => r.summary.survivalRate)),
      avgRiskGateCatchRate: avg(results.map((r) => r.summary.riskGateCaughtPct)),
    },
  };

  return NextResponse.json(combined);
}

function avg(vals: number[]): number {
  return vals.length > 0
    ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100
    : 0;
}
