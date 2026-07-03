// ============================================================
// FailedTxSimulator — transacciones fallidas por congestión / slippage
// ============================================================

export interface FailedTxResult {
  failed: boolean;
  /** Fee (priority fee/gas) pagado aunque la tx no se ejecute. */
  gasCostUsd: number;
  failProbability: number;
  reason: string;
}

/**
 * Probabilidad base de fallo de un swap por red. En Solana un swap puede
 * fallar porque el precio se mueve más allá del slippage tolerado antes de
 * confirmar, o por congestión de la red — pagando el priority fee igual.
 *
 * Parámetros deliberadamente CONSERVADORES (lado pesimista del error): es
 * preferible que el paper asuma algo más de fricción operativa de la real
 * que menos. Se recalibrarán cuando la ejecución real (Fase 2) dé tasas de
 * fallo medidas.
 */
const FAIL_BASE_BY_NETWORK: Record<string, number> = {
  solana: 0.05,
  ethereum: 0.02,
  base: 0.02,
  arbitrum: 0.02,
  optimism: 0.02,
  polygon: 0.03,
  bsc: 0.03,
};

const MAX_FAIL_PROB = 0.35;

export class FailedTxSimulator {
  /**
   * Modela el fallo de una transacción de entrada.
   *
   * Sube con:
   *  - Liquidez baja (el precio se escapa del slippage tolerado antes del fill)
   *  - Volatilidad reciente alta (|priceChange1h|)
   *  - Capa satellite (tokens más nuevos/finos, más congestión competitiva)
   */
  static roll(
    network: string,
    liquidityUsd: number,
    priceChange1hPct: number,
    layer: "core" | "satellite",
    gasCostUsd: number
  ): FailedTxResult {
    const base = FAIL_BASE_BY_NETWORK[network.toLowerCase()] ?? 0.03;

    const liqRisk =
      liquidityUsd < 50_000 ? 2.0 : liquidityUsd < 200_000 ? 1.4 : 1.0;

    const absVol = Math.abs(priceChange1hPct);
    const volRisk = absVol > 20 ? 2.0 : absVol > 10 ? 1.5 : 1.0;

    const layerRisk = layer === "satellite" ? 1.4 : 1.0;

    const failProbability = Math.min(
      MAX_FAIL_PROB,
      base * liqRisk * volRisk * layerRisk
    );

    const failed = Math.random() < failProbability;

    return {
      failed,
      gasCostUsd: failed ? gasCostUsd : 0,
      failProbability,
      reason: failed
        ? `Tx fallida (prob ${(failProbability * 100).toFixed(1)}%, congestión/slippage) — fee perdido`
        : "",
    };
  }
}
