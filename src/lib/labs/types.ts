export type LabRole = "student" | "instructor" | "admin";

export type LabScenarioType = "flash_usdt_tron";

export type LabSessionStatus =
  | "draft"
  | "open"
  | "injected"
  | "completed"
  | "expired";

export type LabInjectionMode = "fake_token" | "pending_flash";

export type LabInjectionStatus =
  | "pending"
  | "injected"
  | "pending_flash"
  | "flash_expired"
  | "burned"
  | "failed";

export interface LabStep {
  id: string;
  title: string;
  description: string;
  type: "info" | "input" | "quiz" | "link" | "compare";
  maxScore: number;
  quizOptions?: { id: string; label: string; correct: boolean }[];
  linkTemplate?: string;
}

export interface LabScenario {
  type: LabScenarioType;
  network: "tron";
  title: string;
  description: string;
  defaultTtlHours: number;
  defaultAmount: number;
  defaultFlashDurationMinutes?: number;
  consentVersion: string;
  injectionMode: LabInjectionMode;
  steps: LabStep[];
}

export interface LabSession {
  id: string;
  instructor_id: string;
  scenario_type: LabScenarioType;
  title: string;
  session_code: string;
  status: LabSessionStatus;
  ttl_hours: number;
  token_amount: number;
  max_participants: number;
  network: string;
  expires_at: string | null;
  created_at: string;
  injection_mode?: LabInjectionMode;
  flash_duration_minutes?: number;
}

export interface LabWallet {
  id: string;
  session_id: string;
  user_id: string;
  tron_address: string;
  consent_accepted_at: string;
  consent_version: string;
  enrolled_at: string;
}

export interface LabInjection {
  id: string;
  session_id: string;
  wallet_id: string;
  user_id: string;
  amount: number;
  tx_hash: string | null;
  contract_address: string | null;
  injected_at: string | null;
  expires_at: string;
  burned_at: string | null;
  status: LabInjectionStatus;
}

export interface StepCompletionResult {
  stepId: string;
  score: number;
  maxScore: number;
  correct: boolean;
  feedback: string;
}

export interface VerificationReport {
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  stepResults: StepCompletionResult[];
}
