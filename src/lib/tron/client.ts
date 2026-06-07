// eslint-disable-next-line @typescript-eslint/no-require-imports
const TronWebModule = require("tronweb");

export type TronWebInstance = {
  isAddress: (address: string) => boolean;
  address: { fromPrivateKey: (pk: string) => string };
  contract: () => {
    at: (address: string) => Promise<TronContract>;
  };
  trx: {
    getTransactionInfo: (txHash: string) => Promise<{ blockNumber?: number; receipt?: { result?: string } } | null>;
  };
};

type TronContract = {
  mint: (to: string, amount: string | number) => { send: (opts?: { feeLimit?: number; shouldPollResponse?: boolean }) => Promise<string> };
  injectTo: (to: string, amount: string | number) => { send: (opts?: { feeLimit?: number; shouldPollResponse?: boolean }) => Promise<string> };
  flashInject: (to: string, amount: string | number, durationSeconds: string | number) => { send: (opts?: { feeLimit?: number; shouldPollResponse?: boolean }) => Promise<string> };
  clearFlash: (holder: string) => { send: (opts?: { feeLimit?: number }) => Promise<string> };
  burnFrom: (holder: string, amount: string | number) => { send: (opts?: { feeLimit?: number }) => Promise<string> };
  balanceOf: (holder: string) => { call: () => Promise<string | number | bigint> };
  flashBalanceOf: (holder: string) => { call: () => Promise<string | number | bigint> };
  flashExpiresAt: (holder: string) => { call: () => Promise<string | number | bigint> };
  realBalanceOf: (holder: string) => { call: () => Promise<string | number | bigint> };
  transfer: (to: string, amount: string | number) => { send: (opts?: { feeLimit?: number; shouldPollResponse?: boolean }) => Promise<string> };
};

const TronWeb = TronWebModule.TronWeb ?? TronWebModule.default ?? TronWebModule;

export function isTronConfigured(): boolean {
  return Boolean(
    process.env.TRON_LAB_TREASURY_PRIVATE_KEY &&
      process.env.TRON_FLASH_USDT_LAB_CONTRACT
  );
}

export function getTronWeb(): TronWebInstance {
  const privateKey = process.env.TRON_LAB_TREASURY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("TRON_LAB_TREASURY_PRIVATE_KEY no configurada");
  }

  const fullHost =
    process.env.TRON_NETWORK === "shasta"
      ? "https://api.shasta.trongrid.io"
      : "https://api.trongrid.io";

  const headers: Record<string, string> = {};
  if (process.env.TRONGRID_API_KEY) {
    headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
  }

  return new TronWeb({
    fullHost,
    headers,
    privateKey,
  }) as TronWebInstance;
}

export function getLabContractAddress(): string {
  const addr = process.env.TRON_FLASH_USDT_LAB_CONTRACT;
  if (!addr) throw new Error("TRON_FLASH_USDT_LAB_CONTRACT no configurada");
  return addr;
}

export function toTokenUnits(amount: number, decimals = 6): string {
  const factor = BigInt(10 ** decimals);
  const whole = BigInt(Math.floor(amount));
  const frac = amount - Math.floor(amount);
  const fracPart = BigInt(Math.round(frac * Number(factor)));
  return (whole * factor + fracPart).toString();
}

export function fromTokenUnits(raw: string | number | bigint, decimals = 6): string {
  const value = BigInt(String(raw));
  const factor = BigInt(10 ** decimals);
  const whole = value / factor;
  const frac = value % factor;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}
