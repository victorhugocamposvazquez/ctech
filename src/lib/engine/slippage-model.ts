// ============================================================
// SlippageModel — AMM constant-product slippage simulation
// ============================================================

export interface SlippageEstimate {
  slippagePct: number;
  priceImpactPct: number;
  effectivePrice: number;
  depthScore: number;
}

export interface SlippageModelOpts {
  feeRate?: number;
  concentrationFactor?: number;
}

export class SlippageModel {
  /**
   * Constant-product AMM: x * y = k
   *
   * For a trade of `sizeUsd` against a pool with `liquidityUsd`:
   *   reserveQuote = effectiveLiq / 2
   *   reserveBase  = effectiveLiq / 2
   *   newReserveQuote = reserveQuote + amountIn*(1-fee)
   *   newReserveBase  = k / newReserveQuote
   *   priceImpact = (effectivePrice / idealPrice) - 1
   *
   * `concentrationFactor` > 1 models concentrated liquidity (Uniswap V3)
   * where the same TVL provides deeper order book in the active range.
   */
  static estimate(
    sizeUsd: number,
    liquidityUsd: number,
    currentPrice: number,
    side: "buy" | "sell",
    opts?: SlippageModelOpts
  ): SlippageEstimate {
    const fee = opts?.feeRate ?? 0.003;
    const conc = opts?.concentrationFactor ?? 1.0;

    if (liquidityUsd <= 0 || currentPrice <= 0) {
      return {
        slippagePct: 0.05,
        priceImpactPct: 0.05,
        effectivePrice: currentPrice,
        depthScore: 1,
      };
    }

    const effectiveLiq = liquidityUsd * conc;
    const reserveQuote = effectiveLiq / 2;
    const reserveBase = effectiveLiq / 2;
    const k = reserveQuote * reserveBase;

    const amountIn = sizeUsd * (1 - fee);
    const depthScore = Math.min(sizeUsd / liquidityUsd, 1);

    let priceImpactPct: number;
    let effectivePrice: number;

    if (side === "buy") {
      const newReserveQuote = reserveQuote + amountIn;
      const newReserveBase = k / newReserveQuote;
      const amountOut = reserveBase - newReserveBase;
      if (amountOut <= 0) {
        return {
          slippagePct: 0.15,
          priceImpactPct: 0.15,
          effectivePrice: currentPrice * 1.15,
          depthScore: 1,
        };
      }
      effectivePrice = amountIn / amountOut;
      const idealPrice = reserveQuote / reserveBase;
      priceImpactPct = Math.max(0, (effectivePrice - idealPrice) / idealPrice);
    } else {
      const tokenAmount = sizeUsd / currentPrice;
      const tokenIn = tokenAmount * (1 - fee);
      const newReserveBase = reserveBase + tokenIn;
      const newReserveQuote = k / newReserveBase;
      const quoteOut = reserveQuote - newReserveQuote;
      if (quoteOut <= 0) {
        return {
          slippagePct: 0.15,
          priceImpactPct: 0.15,
          effectivePrice: currentPrice * 0.85,
          depthScore: 1,
        };
      }
      effectivePrice = quoteOut / tokenAmount;
      priceImpactPct = Math.max(0, (currentPrice - effectivePrice) / currentPrice);
    }

    const noise = (Math.random() - 0.3) * 0.001 * (1 + depthScore);
    const slippagePct = Math.max(0.0001, priceImpactPct + fee + noise);

    return {
      slippagePct: Math.min(slippagePct, 0.15),
      priceImpactPct: Math.min(priceImpactPct, 0.15),
      effectivePrice,
      depthScore,
    };
  }
}
