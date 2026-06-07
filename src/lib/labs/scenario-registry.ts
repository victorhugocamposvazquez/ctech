import type { LabInjectionMode, LabScenario, LabStep } from "./types";
import { FLASH_USDT_EVM_SCENARIO, LAB_CONSENT_TEXT } from "./scenarios/flash-usdt-evm";
import {
  PENDING_FLASH_USDT_EVM_SCENARIO,
  PENDING_LAB_CONSENT_TEXT,
} from "./scenarios/pending-flash-usdt-evm";

export function getScenarioByMode(mode: LabInjectionMode): LabScenario {
  return mode === "pending_flash"
    ? PENDING_FLASH_USDT_EVM_SCENARIO
    : FLASH_USDT_EVM_SCENARIO;
}

export function getScenarioSteps(mode: LabInjectionMode = "fake_token"): LabStep[] {
  return getScenarioByMode(mode).steps;
}

export function getConsentForMode(mode: LabInjectionMode): {
  text: string;
  version: string;
} {
  const scenario = getScenarioByMode(mode);
  return {
    text: mode === "pending_flash" ? PENDING_LAB_CONSENT_TEXT : LAB_CONSENT_TEXT,
    version: scenario.consentVersion,
  };
}
