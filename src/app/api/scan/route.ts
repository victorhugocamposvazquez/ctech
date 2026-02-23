import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ArkhamClient } from "@/lib/arkham/client";
import { WalletTracker } from "@/lib/arkham/wallet-tracker";
import { WalletScorer } from "@/lib/arkham/wallet-scorer";
import { SignalGenerator } from "@/lib/arkham/signal-generator";

/**
 * POST /api/scan — ejecuta un ciclo completo:
 *  1. Escanea swaps recientes de todas las wallets tracked (Arkham).
 *  2. Recalcula scores de wallets con movimientos.
 *  3. Genera señales operativas si wallet_score + token_health pasan filtros.
 *
 * En producción esto será un cron/worker; por ahora se dispara manualmente.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let arkham: ArkhamClient;
  try {
    arkham = new ArkhamClient();
  } catch {
    return NextResponse.json(
      { error: "ARKHAM_API_KEY no configurada en el servidor" },
      { status: 500 }
    );
  }

  const tracker = new WalletTracker(arkham, supabase);
  const scorer = new WalletScorer(supabase);
  const signalGen = new SignalGenerator(supabase, user.id);

  const movements = await tracker.scanUser(user.id);

  const scoredWalletIds = new Set(movements.map((m) => m.walletId));
  const scores = [];
  for (const walletId of scoredWalletIds) {
    const score = await scorer.scoreWallet(walletId);
    if (score) scores.push(score);
  }

  const signals = await signalGen.processMovements(movements);

  return NextResponse.json({
    movementsDetected: movements.length,
    walletsScored: scores.length,
    signalsGenerated: signals.length,
    signals: signals.map((s) => ({
      symbol: s.movement.tokenSymbol,
      layer: s.layer,
      walletScore: s.walletScore,
      tokenHealthScore: s.tokenHealthScore,
      amountUsd: s.movement.amountUsd,
    })),
  });
}
