import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ShadowQuoteMeta {
  hasRoute: boolean;
  measuredImpactPct: number | null;
  reportedImpactPct: number | null;
  routeHops: number | null;
  modelSlippagePct: number | null;
  amountUsd: number;
}

/**
 * GET /api/validation/shortfall — comparación modelo de slippage vs quotes
 * reales de Jupiter capturadas en cada entrada paper.
 *
 * deltaPct > 0: la realidad es PEOR que el modelo (el paper es optimista).
 * deltaPct < 0: el modelo es conservador (margen de seguridad).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("trades")
    .select("metadata, created_at")
    .eq("user_id", user.id)
    .eq("execution_mode", "paper")
    .not("metadata->shadowQuote", "is", null)
    .order("created_at", { ascending: false })
    .limit(1000);

  const quotes: ShadowQuoteMeta[] = (data ?? [])
    .map((t) => (t.metadata as Record<string, unknown>)?.shadowQuote)
    .filter(Boolean) as ShadowQuoteMeta[];

  const noRoute = quotes.filter((q) => !q.hasRoute).length;
  const comparable = quotes.filter(
    (q) => q.hasRoute && q.measuredImpactPct != null && q.modelSlippagePct != null
  );

  if (!comparable.length) {
    return NextResponse.json({
      samples: quotes.length,
      comparable: 0,
      noRouteCount: noRoute,
      note:
        quotes.length === 0
          ? "Sin quotes sombra todavía — se capturan en cada entrada paper sobre Solana."
          : "Hay quotes pero ninguna comparable (sin impacto medido).",
      computedAt: new Date().toISOString(),
    });
  }

  const deltas = comparable
    .map((q) => (q.measuredImpactPct as number) - (q.modelSlippagePct as number))
    .sort((a, b) => a - b);

  const avgModel =
    comparable.reduce((s, q) => s + (q.modelSlippagePct as number), 0) /
    comparable.length;
  const avgReal =
    comparable.reduce((s, q) => s + (q.measuredImpactPct as number), 0) /
    comparable.length;

  return NextResponse.json({
    samples: quotes.length,
    comparable: comparable.length,
    noRouteCount: noRoute,
    avgModelSlippagePct: round4(avgModel),
    avgRealImpactPct: round4(avgReal),
    medianDeltaPct: round4(percentile(deltas, 50)),
    p90DeltaPct: round4(percentile(deltas, 90)),
    /** % de entradas donde la realidad fue peor que el modelo. */
    realWorsePct: round4(deltas.filter((d) => d > 0).length / deltas.length),
    note:
      "delta = impacto real Jupiter - slippage modelado. Positivo = el paper es optimista; negativo = el modelo tiene margen.",
    computedAt: new Date().toISOString(),
  });
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function round4(v: number): number {
  return Math.round(v * 10_000) / 10_000;
}
