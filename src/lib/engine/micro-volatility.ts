// ============================================================
// MicroVolatility — Geometric Brownian Motion price noise
// ============================================================

export interface MicroVolatilityResult {
  adjustedPrice: number;
  noisePct: number;
}

export interface MicroVolatilityOpts {
  annualizedVol?: number;
  priceChange1hPct?: number;
  drift?: number;
}

export class MicroVolatility {
  /**
   * GBM: dS = S * (μ·dt + σ·√dt·Z)
   *
   * Simulates price movement during the latency window between
   * signal detection and trade execution.
   *
   * @param price       - Current observed price
   * @param latencyMs   - Time window in ms (fill latency)
   * @param opts.annualizedVol    - Override annualized volatility
   * @param opts.priceChange1hPct - Used to estimate vol if not provided
   * @param opts.drift            - Drift term (default 0 for micro-periods)
   */
  static apply(
    price: number,
    latencyMs: number,
    opts?: MicroVolatilityOpts
  ): MicroVolatilityResult {
    if (price <= 0 || latencyMs <= 0) {
      return { adjustedPrice: price, noisePct: 0 };
    }

    const vol =
      opts?.annualizedVol ?? MicroVolatility.estimateVol(opts?.priceChange1hPct ?? 0);
    const drift = opts?.drift ?? 0;

    const dtYears = latencyMs / 3_600_000 / 8760;
    const sqrtDt = Math.sqrt(dtYears);

    const z = MicroVolatility.boxMuller();
    const noisePct = drift * dtYears + vol * sqrtDt * z;
    const adjustedPrice = price * (1 + noisePct);

    return {
      adjustedPrice: Math.max(adjustedPrice, price * 0.5),
      noisePct,
    };
  }

  /**
   * Estimates annualized vol from 1h price change.
   * vol_annual ≈ |change_1h| * √(24 * 365)
   * Clamped to [0.5, 20] (50% – 2000% annualized).
   */
  static estimateVol(priceChange1hPct: number): number {
    const absChange = Math.abs(priceChange1hPct / 100);
    const annualized = absChange * Math.sqrt(24 * 365);
    return Math.max(0.5, Math.min(annualized, 20));
  }

  private static boxMuller(): number {
    const u1 = Math.max(1e-10, Math.random());
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}
