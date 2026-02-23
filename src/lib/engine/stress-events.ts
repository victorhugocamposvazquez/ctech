// ============================================================
// StressEventSimulator — black swan / tail risk simulation
// ============================================================

export type StressEventType =
  | "liquidity_rug"
  | "flash_crash"
  | "exploit_hack"
  | "whale_dump"
  | "oracle_failure"
  | "none";

export interface StressEvent {
  type: StressEventType;
  severity: number;
  liquidityImpactPct: number;
  priceImpactPct: number;
  description: string;
}

export interface StressTestResult {
  scenariosRun: number;
  events: StressScenarioOutcome[];
  summary: {
    avgLossPct: number;
    maxLossPct: number;
    survivalRate: number;
    avgRecoveryTrades: number;
    riskGateCaughtPct: number;
  };
}

export interface StressScenarioOutcome {
  event: StressEvent;
  positionLossPct: number;
  capitalImpactPct: number;
  riskGateWouldPause: boolean;
  trailingStopTriggered: boolean;
  estimatedRecoveryTrades: number;
}

interface PositionContext {
  positionUsd: number;
  capitalUsd: number;
  liquidityUsd: number;
  network: string;
  layer: "core" | "satellite";
  pnlToday: number;
  pnlThisWeek: number;
}

const EVENT_PROFILES: Record<
  Exclude<StressEventType, "none">,
  { baseProbPerCycle: number; minSeverity: number; maxSeverity: number }
> = {
  liquidity_rug: { baseProbPerCycle: 0.003, minSeverity: 0.6, maxSeverity: 1.0 },
  flash_crash: { baseProbPerCycle: 0.008, minSeverity: 0.3, maxSeverity: 0.8 },
  exploit_hack: { baseProbPerCycle: 0.001, minSeverity: 0.8, maxSeverity: 1.0 },
  whale_dump: { baseProbPerCycle: 0.02, minSeverity: 0.2, maxSeverity: 0.6 },
  oracle_failure: { baseProbPerCycle: 0.002, minSeverity: 0.4, maxSeverity: 0.7 },
};

/**
 * StressEventSimulator models extreme market events:
 *
 *  - Liquidity rug: LP removes liquidity → slippage explodes, price craters
 *  - Flash crash: cascading liquidations → -30..80% in minutes
 *  - Exploit/hack: contract drained → token goes to near-zero
 *  - Whale dump: large holder sells → -15..50% with temporary liquidity shock
 *  - Oracle failure: price feed stale/manipulated → wrong execution price
 *
 * Two modes:
 *  1. rollForEvent(): probabilistic per-cycle check during live simulation
 *  2. runStressTest(): runs N deterministic scenarios to evaluate portfolio resilience
 */
export class StressEventSimulator {
  /**
   * Roll dice for each cycle — returns an event if one triggers.
   * Probability scales with pool risk (low liquidity, young pair, early layer).
   */
  static rollForEvent(
    liquidityUsd: number,
    pairAgeHours: number,
    layer: "core" | "satellite"
  ): StressEvent {
    const liqRisk = liquidityUsd < 50_000 ? 2.0 : liquidityUsd < 200_000 ? 1.3 : 1.0;
    const ageRisk = pairAgeHours < 24 ? 2.5 : pairAgeHours < 72 ? 1.5 : 1.0;
    const layerRisk = layer === "satellite" ? 1.8 : 1.0;
    const multiplier = liqRisk * ageRisk * layerRisk;

    for (const [type, profile] of Object.entries(EVENT_PROFILES)) {
      const prob = profile.baseProbPerCycle * multiplier;
      if (Math.random() < prob) {
        const severity =
          profile.minSeverity +
          Math.random() * (profile.maxSeverity - profile.minSeverity);
        return StressEventSimulator.buildEvent(
          type as Exclude<StressEventType, "none">,
          severity
        );
      }
    }

    return { type: "none", severity: 0, liquidityImpactPct: 0, priceImpactPct: 0, description: "" };
  }

  /**
   * Deterministic stress test — runs every event type at multiple
   * severity levels against a given position context.
   */
  static runStressTest(ctx: PositionContext, iterations = 50): StressTestResult {
    const events: StressScenarioOutcome[] = [];
    const eventTypes = Object.keys(EVENT_PROFILES) as Array<Exclude<StressEventType, "none">>;

    for (const type of eventTypes) {
      const profile = EVENT_PROFILES[type];
      const severitySteps = Math.max(2, Math.floor(iterations / eventTypes.length));

      for (let i = 0; i < severitySteps; i++) {
        const severity =
          profile.minSeverity +
          (i / (severitySteps - 1)) * (profile.maxSeverity - profile.minSeverity);

        const event = StressEventSimulator.buildEvent(type, severity);
        const outcome = StressEventSimulator.evaluateImpact(event, ctx);
        events.push(outcome);
      }
    }

    const totalLosses = events.map((e) => e.positionLossPct);
    const avgLoss = totalLosses.reduce((s, v) => s + v, 0) / totalLosses.length;
    const maxLoss = Math.max(...totalLosses);
    const survived = events.filter((e) => e.capitalImpactPct < 0.10).length;
    const caught = events.filter((e) => e.riskGateWouldPause).length;
    const avgRecovery =
      events.reduce((s, e) => s + e.estimatedRecoveryTrades, 0) / events.length;

    return {
      scenariosRun: events.length,
      events,
      summary: {
        avgLossPct: round(avgLoss * 100),
        maxLossPct: round(maxLoss * 100),
        survivalRate: round((survived / events.length) * 100),
        avgRecoveryTrades: round(avgRecovery),
        riskGateCaughtPct: round((caught / events.length) * 100),
      },
    };
  }

  private static buildEvent(
    type: Exclude<StressEventType, "none">,
    severity: number
  ): StressEvent {
    switch (type) {
      case "liquidity_rug":
        return {
          type,
          severity,
          liquidityImpactPct: -(0.7 + severity * 0.3),
          priceImpactPct: -(0.5 + severity * 0.45),
          description: `Liquidity rug (${(severity * 100).toFixed(0)}% severity): LP removed ${((0.7 + severity * 0.3) * 100).toFixed(0)}% of liquidity`,
        };
      case "flash_crash":
        return {
          type,
          severity,
          liquidityImpactPct: -(0.1 + severity * 0.3),
          priceImpactPct: -(0.2 + severity * 0.6),
          description: `Flash crash (${(severity * 100).toFixed(0)}% severity): cascading liquidations`,
        };
      case "exploit_hack":
        return {
          type,
          severity,
          liquidityImpactPct: -(0.8 + severity * 0.2),
          priceImpactPct: -(0.85 + severity * 0.14),
          description: `Exploit/hack (${(severity * 100).toFixed(0)}% severity): contract vulnerability`,
        };
      case "whale_dump":
        return {
          type,
          severity,
          liquidityImpactPct: -(0.05 + severity * 0.15),
          priceImpactPct: -(0.15 + severity * 0.35),
          description: `Whale dump (${(severity * 100).toFixed(0)}% severity): large holder exiting`,
        };
      case "oracle_failure":
        return {
          type,
          severity,
          liquidityImpactPct: 0,
          priceImpactPct: -(0.1 + severity * 0.4) * (Math.random() > 0.5 ? 1 : -1),
          description: `Oracle failure (${(severity * 100).toFixed(0)}% severity): stale/manipulated price feed`,
        };
    }
  }

  private static evaluateImpact(
    event: StressEvent,
    ctx: PositionContext
  ): StressScenarioOutcome {
    const positionLossPct = Math.abs(event.priceImpactPct);
    const positionLossUsd = ctx.positionUsd * positionLossPct;
    const capitalImpactPct = ctx.capitalUsd > 0 ? positionLossUsd / ctx.capitalUsd : 1;

    const newPnlToday = ctx.pnlToday - positionLossUsd;
    const dailyLoss = ctx.capitalUsd > 0 ? Math.abs(Math.min(newPnlToday, 0)) / ctx.capitalUsd : 0;
    const riskGateWouldPause = dailyLoss >= 0.02;

    const trailingStopPct = ctx.layer === "core" ? 0.05 : 0.10;
    const trailingStopTriggered = positionLossPct > trailingStopPct;

    const avgTradeExpectancy = 0.002;
    const estimatedRecoveryTrades =
      avgTradeExpectancy > 0 && ctx.capitalUsd > 0
        ? Math.ceil(positionLossUsd / (ctx.capitalUsd * avgTradeExpectancy))
        : 999;

    return {
      event,
      positionLossPct,
      capitalImpactPct,
      riskGateWouldPause,
      trailingStopTriggered,
      estimatedRecoveryTrades: Math.min(estimatedRecoveryTrades, 999),
    };
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
