/**
 * Cliente de Jupiter (agregador DEX de Solana) para QUOTES SOMBRA.
 *
 * No ejecuta swaps: pide la cotización real que obtendríamos si la orden
 * fuera de verdad, en el momento exacto de la entrada paper. Comparar ese
 * dato con el SlippageModel convierte el "peaje paper→real" (implementation
 * shortfall) de una conjetura en una medición empírica, sin arriesgar un
 * céntimo y semanas antes de la Fase 2.
 *
 * Truco de las dos quotes: la API devuelve outAmount en unidades atómicas
 * del token, cuyos decimales no conocemos. Cotizando una referencia
 * pequeña ($10, ~spot) y el tamaño real, los decimales se cancelan:
 *   impacto = 1 - (out_size/usd_size) / (out_ref/usd_ref)
 */

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const REF_AMOUNT_USD = 10;
const TIMEOUT_MS = 6_000;

/** Endpoints en orden de preferencia (lite = gratuito sin key). */
const QUOTE_ENDPOINTS = [
  "https://lite-api.jup.ag/swap/v1/quote",
  "https://quote-api.jup.ag/v6/quote",
];

export interface ShadowQuote {
  /** false = Jupiter no encuentra ruta: el token NO es comprable/vendible vía agregador. */
  hasRoute: boolean;
  /** Impacto de precio medido (fracción, 0.02 = 2%) entre quote $10 y tamaño real. */
  measuredImpactPct: number | null;
  /** priceImpactPct crudo que reporta Jupiter para el tamaño real. */
  reportedImpactPct: number | null;
  /** Número de saltos de la ruta (1 = pool directo). */
  routeHops: number | null;
  amountUsd: number;
  quotedAt: string;
}

interface JupiterQuoteResponse {
  outAmount?: string;
  priceImpactPct?: string | number;
  routePlan?: unknown[];
  error?: string;
}

export class JupiterClient {
  /**
   * Quote sombra de COMPRA (USDC → token) para un tamaño en USD.
   * Devuelve null solo si ambos endpoints fallan por red/timeout
   * (distinto de "sin ruta", que es información valiosa).
   */
  async getShadowQuote(
    tokenMint: string,
    amountUsd: number
  ): Promise<ShadowQuote | null> {
    const sizeAtomic = Math.max(1, Math.round(amountUsd * 1e6));
    const refAtomic = Math.round(REF_AMOUNT_USD * 1e6);

    const sizeQuote = await this.fetchQuote(tokenMint, sizeAtomic);
    if (sizeQuote === "network_error") return null;

    if (sizeQuote === "no_route") {
      return {
        hasRoute: false,
        measuredImpactPct: null,
        reportedImpactPct: null,
        routeHops: null,
        amountUsd,
        quotedAt: new Date().toISOString(),
      };
    }

    let measuredImpactPct: number | null = null;
    const refQuote = await this.fetchQuote(tokenMint, refAtomic);
    if (refQuote !== "network_error" && refQuote !== "no_route") {
      const outSize = Number(sizeQuote.outAmount ?? 0);
      const outRef = Number(refQuote.outAmount ?? 0);
      if (outSize > 0 && outRef > 0) {
        const unitSize = outSize / amountUsd;
        const unitRef = outRef / REF_AMOUNT_USD;
        if (unitRef > 0) {
          measuredImpactPct = Math.max(0, 1 - unitSize / unitRef);
        }
      }
    }

    return {
      hasRoute: true,
      measuredImpactPct:
        measuredImpactPct != null ? round4(measuredImpactPct) : null,
      reportedImpactPct: parseImpact(sizeQuote.priceImpactPct),
      routeHops: Array.isArray(sizeQuote.routePlan)
        ? sizeQuote.routePlan.length
        : null,
      amountUsd,
      quotedAt: new Date().toISOString(),
    };
  }

  private async fetchQuote(
    tokenMint: string,
    amountAtomic: number
  ): Promise<JupiterQuoteResponse | "no_route" | "network_error"> {
    const params = new URLSearchParams({
      inputMint: USDC_MINT,
      outputMint: tokenMint,
      amount: String(amountAtomic),
      slippageBps: "100",
      swapMode: "ExactIn",
    });

    for (const endpoint of QUOTE_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch(`${endpoint}?${params}`, {
          signal: controller.signal,
          headers: { accept: "application/json" },
        });
        clearTimeout(timer);

        if (res.status === 400 || res.status === 404) {
          // Jupiter responde 400/404 cuando no existe ruta para el mint
          return "no_route";
        }
        if (!res.ok) continue;

        const body = (await res.json()) as JupiterQuoteResponse;
        if (body.error || !body.outAmount) return "no_route";
        return body;
      } catch {
        continue;
      }
    }
    return "network_error";
  }
}

function parseImpact(v: string | number | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? round4(n) : null;
}

function round4(v: number): number {
  return Math.round(v * 10_000) / 10_000;
}
