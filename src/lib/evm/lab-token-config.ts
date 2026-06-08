/**
 * Nombre/símbolo del token lab que se pasan al constructor en el deploy.
 *
 * Las wallets (Trust/MetaMask) OCULTAN automáticamente tokens cuyo símbolo es
 * exactamente "USDT" por considerarse suplantadores. Para que el saldo aparezca
 * sin importar el contrato manualmente, usamos un símbolo propio (configurable).
 */
export const DEFAULT_LAB_TOKEN_NAME = "Flash USDT";
export const DEFAULT_LAB_TOKEN_SYMBOL = "fUSDT";

const MAX_NAME_LEN = 40;
const MAX_SYMBOL_LEN = 20;

export type LabTokenMeta = { name: string; symbol: string };

export function getDefaultLabTokenMeta(): LabTokenMeta {
  return {
    name: process.env.EVM_LAB_TOKEN_NAME?.trim() || DEFAULT_LAB_TOKEN_NAME,
    symbol: process.env.EVM_LAB_TOKEN_SYMBOL?.trim() || DEFAULT_LAB_TOKEN_SYMBOL,
  };
}

/** Normaliza overrides del panel; cae a los defaults si vienen vacíos/ inválidos. */
export function resolveLabTokenMeta(override?: {
  name?: string | null;
  symbol?: string | null;
}): LabTokenMeta {
  const defaults = getDefaultLabTokenMeta();
  const name = (override?.name ?? "").trim().slice(0, MAX_NAME_LEN) || defaults.name;
  const symbol = (override?.symbol ?? "").trim().slice(0, MAX_SYMBOL_LEN) || defaults.symbol;
  return { name, symbol };
}
