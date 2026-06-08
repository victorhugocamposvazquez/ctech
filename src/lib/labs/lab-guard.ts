import type { SupabaseClient } from "@supabase/supabase-js";
import type { LabRole } from "./types";
import { isValidEvmAddress } from "@/lib/evm/usdt-canonical";
import { LAB_CONSENT_TEXT } from "./scenarios/flash-usdt-evm";

export { LAB_CONSENT_TEXT };

const INJECT_RATE_LIMIT_MS = 60_000;
const injectTimestamps = new Map<string, number>();

export function parseLabAdminEmails(): string[] {
  return (process.env.LAB_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isLabAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return parseLabAdminEmails().includes(email.toLowerCase());
}

/** Promote LAB_ADMIN_EMAILS to admin in lab_roles (RLS: own row). */
export async function ensureInstructorAccess(
  supabase: SupabaseClient,
  userId: string,
  email: string | undefined | null
): Promise<LabRole | null> {
  if (!isLabAdminEmail(email)) return null;

  const role: LabRole = "admin";
  await supabase.from("lab_roles").upsert({ user_id: userId, role }, { onConflict: "user_id" });
  return role;
}

export async function getLabRole(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<LabRole> {
  await ensureInstructorAccess(supabase, userId, email);

  const { data } = await supabase
    .from("lab_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  return (data?.role as LabRole) ?? "student";
}

export async function isInstructorOrAdmin(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<boolean> {
  const role = await getLabRole(supabase, userId, email);
  return role === "instructor" || role === "admin";
}

export async function assertInstructor(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const allowed = await isInstructorOrAdmin(supabase, userId, email);
  if (!allowed) {
    return { ok: false, error: "Se requiere rol instructor o admin", status: 403 };
  }
  return { ok: true };
}

export async function getSessionForUser(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
) {
  const { data: session, error } = await supabase
    .from("lab_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) {
    return { session: null, error: "Sesión no encontrada", status: 404 as const };
  }

  const isInstructor = session.instructor_id === userId;
  const { data: enrollment } = await supabase
    .from("lab_wallets")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!isInstructor && !enrollment) {
    return { session: null, error: "No tienes acceso a esta sesión", status: 403 as const };
  }

  return { session, isInstructor, enrollment, error: null, status: 200 as const };
}

export function validateEvmWalletAddress(address: string): string | null {
  if (!address?.trim()) return "La dirección EVM es obligatoria";
  if (!isValidEvmAddress(address)) {
    return "Dirección EVM inválida (debe ser 0x seguido de 40 caracteres hex)";
  }
  return null;
}

const VALID_CONSENT_VERSIONS = ["2.0", "2.1"];

export function validateConsent(
  consentAccepted: boolean,
  consentVersion: string
): string | null {
  if (!consentAccepted) return "Debes aceptar el consentimiento del laboratorio";
  if (!VALID_CONSENT_VERSIONS.includes(consentVersion)) {
    return "Versión de consentimiento desactualizada. Recarga la página.";
  }
  return null;
}

export function checkInjectRateLimit(sessionId: string): string | null {
  const key = `inject:${sessionId}`;
  const last = injectTimestamps.get(key);
  const now = Date.now();
  if (last && now - last < INJECT_RATE_LIMIT_MS) {
    const waitSec = Math.ceil((INJECT_RATE_LIMIT_MS - (now - last)) / 1000);
    return `Espera ${waitSec}s antes de volver a inyectar en esta sesión`;
  }
  injectTimestamps.set(key, now);
  return null;
}

export function generateSessionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function logLabAudit(
  supabase: SupabaseClient,
  params: {
    userId?: string;
    sessionId?: string;
    action: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
  }
) {
  await supabase.from("lab_audit_log").insert({
    user_id: params.userId ?? null,
    session_id: params.sessionId ?? null,
    action: params.action,
    metadata: params.metadata ?? {},
    ip_address: params.ipAddress ?? null,
  });
}

export function getClientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}
