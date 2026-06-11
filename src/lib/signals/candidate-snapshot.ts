import type { DexPair } from "../market/dexscreener";

/**
 * CandidateSnapshot — registro compacto de CADA candidato visto por los
 * detectores en un ciclo, haya pasado los filtros o no.
 *
 * Es la base del archivo histórico sin sesgo de superviviente: los feeds
 * públicos olvidan a los tokens que mueren, así que la única forma de
 * tener el universo completo (incluidas las pérdidas que habríamos
 * sufrido) es capturarlo en vivo antes de saber el desenlace.
 *
 * Usos previstos (Fase 1+):
 *  - Replay de filtros: re-ejecutar configuraciones alternativas sobre el
 *    histórico sin esperar semanas de paper.
 *  - Distribuciones empíricas (cola de pérdidas, frecuencia de 10x/50x)
 *    para sustituir los supuestos del Monte Carlo.
 *  - Dataset etiquetado para clasificadores (rug/explosión) cruzando con
 *    la evolución posterior del precio.
 */
export interface CandidateSnapshot {
  /** Detector que vio el candidato. */
  src: "momentum" | "early";
  address: string;
  symbol: string;
  network: string;
  pairAddress: string;
  dexId: string;
  priceUsd: number;
  liquidityUsd: number;
  fdv: number;
  marketCap: number;
  /** Volumen USD por ventana. */
  vol: { m5: number; h1: number; h6: number; h24: number };
  /** Cambio de precio % por ventana. */
  pc: { m5: number; h1: number; h6: number; h24: number };
  /** Transacciones compra/venta en 1h y 24h. */
  txns: { h1b: number; h1s: number; h24b: number; h24s: number };
  /** Wallets únicas comprando/vendiendo 24h (solo ruta GeckoTerminal). */
  buyers24h: number | null;
  sellers24h: number | null;
  /** Epoch ms de creación del par (0 = desconocido). */
  pairCreatedAt: number;
  /** Score del detector si llegó a calcularse (solo aceptados). */
  score: number | null;
  /** Motivo de rechazo del filtro, o null si pasó todos. */
  reject: string | null;
}

export function toCandidateSnapshot(
  pair: DexPair,
  src: CandidateSnapshot["src"],
  opts: {
    score?: number | null;
    reject?: string | null;
    buyers24h?: number | null;
    sellers24h?: number | null;
  } = {}
): CandidateSnapshot {
  return {
    src,
    address: pair.baseToken.address,
    symbol: pair.baseToken.symbol,
    network: pair.chainId?.toLowerCase() ?? "",
    pairAddress: pair.pairAddress,
    dexId: pair.dexId,
    priceUsd: parseFloat(pair.priceUsd) || 0,
    liquidityUsd: pair.liquidity?.usd ?? 0,
    fdv: pair.fdv ?? 0,
    marketCap: pair.marketCap ?? 0,
    vol: {
      m5: pair.volume?.m5 ?? 0,
      h1: pair.volume?.h1 ?? 0,
      h6: pair.volume?.h6 ?? 0,
      h24: pair.volume?.h24 ?? 0,
    },
    pc: {
      m5: pair.priceChange?.m5 ?? 0,
      h1: pair.priceChange?.h1 ?? 0,
      h6: pair.priceChange?.h6 ?? 0,
      h24: pair.priceChange?.h24 ?? 0,
    },
    txns: {
      h1b: pair.txns?.h1?.buys ?? 0,
      h1s: pair.txns?.h1?.sells ?? 0,
      h24b: pair.txns?.h24?.buys ?? 0,
      h24s: pair.txns?.h24?.sells ?? 0,
    },
    buyers24h: opts.buyers24h ?? null,
    sellers24h: opts.sellers24h ?? null,
    pairCreatedAt: pair.pairCreatedAt ?? 0,
    score: opts.score ?? null,
    reject: opts.reject ?? null,
  };
}
