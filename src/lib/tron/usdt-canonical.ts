export const OFFICIAL_USDT_TRON = {
  contractAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  name: "Tether USD",
  symbol: "USDT",
  decimals: 6,
  issuer: "Tether Limited",
  tronscanUrl: "https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
} as const;

export function isOfficialUsdt(contractAddress: string): boolean {
  return normalizeTronAddress(contractAddress) === OFFICIAL_USDT_TRON.contractAddress;
}

export function normalizeTronAddress(address: string): string {
  return address.trim();
}

const TRON_ADDRESS_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

export function isValidTronAddress(address: string): boolean {
  return TRON_ADDRESS_RE.test(address.trim());
}
