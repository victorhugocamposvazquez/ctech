// ============================================================
// CompetitionSimulator — MEV, front-running & bot simulation
// ============================================================

export interface CompetitionResult {
  additionalSlippagePct: number;
  wasFrontrun: boolean;
  wasBackrun: boolean;
  competitorCount: number;
  description: string;
}

const MEV_RISK_BY_NETWORK: Record<string, number> = {
  ethereum: 0.35,
  base: 0.15,
  arbitrum: 0.10,
  optimism: 0.08,
  polygon: 0.06,
  bsc: 0.12,
  solana: 0.05,
};

export class CompetitionSimulator {
  /**
   * Simulates on-chain competition that degrades fill quality.
   *
   * Factors:
   *  - Network MEV environment (Ethereum highest, Solana lowest)
   *  - Position size visibility (larger trades attract more bots)
   *  - Pool bot density (high-volume pools have more monitoring)
   *  - Front-run: bot sees your tx in mempool, buys before you → worse price
   *  - Back-run: bot sells right after your buy → temporary price dip
   */
  static simulate(
    network: string,
    positionUsd: number,
    poolLiquidityUsd: number,
    poolVolume24h: number
  ): CompetitionResult {
    const baseMevRisk = MEV_RISK_BY_NETWORK[network.toLowerCase()] ?? 0.10;

    const sizeVisibility = Math.min(
      positionUsd / (Math.max(poolLiquidityUsd, 1) * 0.01),
      1
    );

    const botDensity = Math.min(poolVolume24h / 1_000_000, 1) * 0.3;

    const frontrunProb = baseMevRisk * sizeVisibility;
    const backrunProb = baseMevRisk * botDensity * 0.5;

    const wasFrontrun = Math.random() < frontrunProb;
    const wasBackrun = Math.random() < backrunProb;

    let additionalSlippagePct = 0;
    const parts: string[] = [];

    if (wasFrontrun) {
      additionalSlippagePct += 0.002 + Math.random() * 0.008;
      parts.push("front-run detected");
    }
    if (wasBackrun) {
      additionalSlippagePct += 0.001 + Math.random() * 0.003;
      parts.push("back-run detected");
    }

    const competitorCount = Math.floor(botDensity * 20 + sizeVisibility * 5);

    const description =
      parts.length > 0
        ? `${parts.join(" + ")} (${competitorCount} bots, ${network})`
        : `Clean fill (${competitorCount} bots monitoring, ${network})`;

    return {
      additionalSlippagePct,
      wasFrontrun,
      wasBackrun,
      competitorCount,
      description,
    };
  }
}
