export { FLASH_USDT_TRON_SCENARIO, LAB_CONSENT_TEXT } from "./scenarios/flash-usdt-tron";
export {
  PENDING_FLASH_USDT_TRON_SCENARIO,
  PENDING_LAB_CONSENT_TEXT,
} from "./scenarios/pending-flash-usdt-tron";
export * from "./scenario-registry";
export * from "./types";
export * from "./lab-guard";
export * from "./verification-checklist";

import { FLASH_USDT_TRON_SCENARIO } from "./scenarios/flash-usdt-tron";
import type { LabScenarioType } from "./types";

const SCENARIOS = {
  flash_usdt_tron: FLASH_USDT_TRON_SCENARIO,
} as const;

export function getScenario(type: LabScenarioType) {
  return SCENARIOS[type];
}
