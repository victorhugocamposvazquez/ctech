import type { DexPair } from "../market/dexscreener";

export interface WashTradingInput {
  pair: DexPair;
  /** Wallets únicas comprando/vendiendo 24h (solo ruta GeckoTerminal). */
  buyers24h?: number | null;
  sellers24h?: number | null;
}

export interface WashTradingResult {
  /** 0-100: mayor = más probable wash trading. */
  suspectScore: number;
  flags: string[];
  /** Volumen 24h descontado por sospecha de fabricación. */
  effectiveVolume24h: number;
  /** Motivo de rechazo si supera umbral, o null si pasa. */
  rejectReason: string | null;
}

const BLOCK_SCORE = 55;

/**
 * Heurísticas anti wash-trading para memecoins.
 *
 * En Solana es habitual que el deployer (o bots asociados) fabrique volumen
 * con las mismas wallets en bucle para engañar detectores basados en
 * volumen/compras. Sin wallets únicas (ruta Birdeye) usamos patrones de
 * micro-transacciones y volumen/liquidez anómalo.
 */
export function assessWashTrading(input: WashTradingInput): WashTradingResult {
  const { pair, buyers24h, sellers24h } = input;
  const flags: string[] = [];
  let score = 0;

  const liquidityUsd = pair.liquidity?.usd ?? 0;
  const volume24h = pair.volume?.h24 ?? 0;
  const buys24h = pair.txns?.h24?.buys ?? 0;
  const sells24h = pair.txns?.h24?.sells ?? 0;
  const txCount24h = buys24h + sells24h;

  const volToLiq = liquidityUsd > 0 ? volume24h / liquidityUsd : 0;
  const avgTradeUsd = txCount24h > 0 ? volume24h / txCount24h : 0;

  // --- Ruta con wallets únicas (GeckoTerminal) ---
  const buyers = buyers24h ?? 0;
  const sellers = sellers24h ?? 0;
  const hasUniqueWallets = buyers24h != null && sellers24h != null;

  if (hasUniqueWallets && buyers + sellers > 0 && txCount24h > 0) {
    const txPerParticipant = txCount24h / (buyers + sellers);
    const buysPerBuyer = buyers > 0 ? buys24h / buyers : buys24h;
    const sellsPerSeller = sellers > 0 ? sells24h / sellers : sells24h;

    // Mismas wallets repitiendo compras/ventas en bucle
    if (txPerParticipant >= 4) {
      flags.push("wash_low_unique_participation");
      score += 30;
    }
    if (buysPerBuyer >= 6) {
      flags.push("wash_repeat_buyers");
      score += 25;
    }
    if (sellsPerSeller >= 6) {
      flags.push("wash_repeat_sellers");
      score += 20;
    }

    // Mucho volumen con pocas wallets reales
    if (volToLiq >= 12 && buyers + sellers < 25) {
      flags.push("wash_inflated_volume_few_wallets");
      score += 35;
    }
  }

  // --- Heurísticas sin wallets únicas (Birdeye / DexScreener) ---
  if (txCount24h >= 80 && avgTradeUsd > 0 && avgTradeUsd < 12) {
    flags.push("wash_micro_transactions");
    score += 30;
  }

  if (txCount24h >= 120 && volToLiq >= 10) {
    const buyPressure =
      sells24h > 0 ? buys24h / sells24h : buys24h > 0 ? 5 : 0;
    // Volumen alto con compras≈ventas: round-trip típico de wash
    if (buyPressure >= 0.85 && buyPressure <= 1.15) {
      flags.push("wash_symmetric_flow");
      score += 25;
    }
  }

  if (volToLiq >= 25 && txCount24h >= 50) {
    flags.push("wash_extreme_turnover");
    score += 20;
  }

  // Turnover imposible sin actividad mínima de wallets
  if (hasUniqueWallets && buyers + sellers < 8 && volume24h >= 20_000) {
    flags.push("wash_volume_without_participants");
    score += 40;
  }

  score = Math.min(100, score);

  const volumeDiscount =
    score >= 70 ? 0.25 : score >= 55 ? 0.5 : score >= 35 ? 0.75 : 1;
  const effectiveVolume24h = volume24h * volumeDiscount;

  const rejectReason =
    score >= BLOCK_SCORE ? `wash_trading_${flags[0] ?? "suspect"}` : null;

  return { suspectScore: score, flags, effectiveVolume24h, rejectReason };
}
