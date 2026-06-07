export { FLASH_USDT_EVM_SCENARIO, LAB_CONSENT_TEXT } from "./scenarios/flash-usdt-evm";
export {
  PENDING_FLASH_USDT_EVM_SCENARIO,
  PENDING_LAB_CONSENT_TEXT,
} from "./scenarios/pending-flash-usdt-evm";
export * from "./scenario-registry";
export * from "./types";
export * from "./lab-guard";
export * from "./verification-checklist";

import { FLASH_USDT_EVM_SCENARIO } from "./scenarios/flash-usdt-evm";
import type { LabScenarioType } from "./types";

const SCENARIOS = {
  flash_usdt_evm: FLASH_USDT_EVM_SCENARIO,
} as const;

export function getScenario(type: LabScenarioType) {
  return SCENARIOS[type];
}
