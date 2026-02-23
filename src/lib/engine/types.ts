// ============================================================
// CTech Engine – Tipos compartidos
// ============================================================

export type ExecutionMode = "paper" | "live" | "shadow";
export type Layer = "core" | "satellite";
export type TradeSide = "buy" | "sell";
export type TradeStatus = "open" | "closed" | "cancelled" | "failed";
export type MarketRegime = "risk_on" | "risk_off" | "neutral";
export type WalletCategory =
  | "alpha"
  | "momentum"
  | "early"
  | "lp_arb"
  | "swing"
  | "unknown";

// --------------- Risk ---------------

export interface RiskConfig {
  core: LayerRiskConfig;
  satellite: LayerRiskConfig;
  maxDailyLossPct: number;       // ej. 0.02 = 2%
  maxWeeklyLossPct: number;      // ej. 0.06 = 6%
  satelliteConsecLossLimit: number; // 3 pérdidas seguidas → pausa satellite
  satelliteCooldownMs: number;     // 24h en ms
}

export interface LayerRiskConfig {
  maxRiskPerTradePct: number; // fracción del capital (0.005 = 0.5%)
  maxTradesPerDay: number;
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  core: {
    maxRiskPerTradePct: 0.005,
    maxTradesPerDay: 5,
  },
  satellite: {
    maxRiskPerTradePct: 0.0025,
    maxTradesPerDay: 2,
  },
  maxDailyLossPct: 0.02,
  maxWeeklyLossPct: 0.06,
  satelliteConsecLossLimit: 3,
  satelliteCooldownMs: 24 * 60 * 60 * 1000,
};

export interface RiskState {
  capital: number;
  pnlToday: number;
  pnlThisWeek: number;
  tradesTodayCore: number;
  tradesTodaySatellite: number;
  consecutiveLossesSatellite: number;
  isPaused: boolean;
  pauseReason: string | null;
  pauseUntil: Date | null;
}

export interface RiskVerdict {
  allowed: boolean;
  reason: string | null;
  maxPositionUsd: number;
}

// --------------- Orders & Trades ---------------

export interface OrderRequest {
  userId: string;
  symbol: string;
  tokenAddress: string;
  network: string;
  side: TradeSide;
  amountUsd: number;
  layer: Layer;
  executionMode: ExecutionMode;
  entryReason: string;
  walletMovementId?: string;
  tokenHealthScoreAtEntry?: number;
  walletScoreAtEntry?: number;
  signalId?: string;
  metadata?: Record<string, unknown>;
}

export interface FillResult {
  success: boolean;
  entryPrice: number;
  quantity: number;
  slippage: number;
  gasCost: number;
  latencyMs: number;
  fillTimestamp: Date;
  error?: string;
}

export interface TradeRecord {
  id?: string;
  userId: string;
  signalId?: string;
  symbol: string;
  side: TradeSide;
  status: TradeStatus;
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  pnlAbs?: number;
  pnlPct?: number;
  isWin?: boolean;
  feesAbs?: number;
  executionMode: ExecutionMode;
  layer: Layer;
  slippageSimulated?: number;
  gasSimulated?: number;
  latencyMs?: number;
  entryReason?: string;
  exitReason?: string;
  walletMovementId?: string;
  tokenHealthScoreAtEntry?: number;
  walletScoreAtEntry?: number;
  metadata?: Record<string, unknown>;
}

// --------------- Token Health ---------------

export interface TokenHealthSnapshot {
  tokenId: string;
  liquidityUsd: number;
  volume24hUsd: number;
  spreadPct: number;
  holdersCount: number;
  top10ConcentrationPct: number;
  contractRiskFlags: string[];
  healthScore: number;
}

// --------------- Wallet Intelligence ---------------

export interface WalletScore {
  walletId: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  avgPnlPct: number;
  maxDrawdownPct: number;
  consistencyScore: number;
  overallScore: number;
}

// --------------- Price Feed ---------------

export interface PriceQuote {
  symbol: string;
  tokenAddress: string;
  network: string;
  price: number;
  liquidityUsd: number;
  spreadPct: number;
  timestamp: Date;
}
