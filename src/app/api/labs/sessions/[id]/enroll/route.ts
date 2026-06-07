import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateConsent,
  validateTronWalletAddress,
  logLabAudit,
  getClientIp,
  getSessionForUser,
} from "@/lib/labs/lab-guard";
import { getConsentForMode } from "@/lib/labs/scenario-registry";
import type { LabInjectionMode } from "@/lib/labs/types";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET  /api/labs/sessions/[id]/enroll — session info + enrollment status
 * POST /api/labs/sessions/[id]/enroll — register lab wallet with consent
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const access = await getSessionForUser(supabase, sessionId, user.id);
  if (!access.session) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data: wallet } = await supabase
    .from("lab_wallets")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { count } = await supabase
    .from("lab_wallets")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);

  const injectionMode = (access.session.injection_mode ?? "fake_token") as LabInjectionMode;
  const consent = getConsentForMode(injectionMode);

  return NextResponse.json({
    session: access.session,
    enrolled: wallet,
    participantCount: count ?? 0,
    consentText: consent.text,
    consentVersion: consent.version,
    injectionMode,
    isInstructor: access.isInstructor,
  });
}

export async function POST(req: Request, { params }: RouteParams) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: session } = await supabase
    .from("lab_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  if (session.status !== "open" && session.status !== "draft") {
    return NextResponse.json(
      { error: "Esta sesión ya no acepta inscripciones" },
      { status: 400 }
    );
  }

  const { count } = await supabase
    .from("lab_wallets")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if ((count ?? 0) >= session.max_participants) {
    return NextResponse.json({ error: "Sesión llena" }, { status: 400 });
  }

  const body = await req.json();
  const tronAddress = String(body.tronAddress ?? "").trim();
  const consentAccepted = Boolean(body.consentAccepted);
  const consentVersion = String(body.consentVersion ?? "");

  const consentErr = validateConsent(consentAccepted, consentVersion);
  if (consentErr) {
    return NextResponse.json({ error: consentErr }, { status: 400 });
  }

  const addressErr = validateTronWalletAddress(tronAddress);
  if (addressErr) {
    return NextResponse.json({ error: addressErr }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("lab_wallets")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Ya estás inscrito en esta sesión" }, { status: 409 });
  }

  const { data: wallet, error } = await supabase
    .from("lab_wallets")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      tron_address: tronAddress,
      consent_accepted_at: new Date().toISOString(),
      consent_version: consentVersion,
      consent_ip: getClientIp(req),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (session.status === "draft") {
    await admin
      .from("lab_sessions")
      .update({ status: "open" })
      .eq("id", sessionId);
  }

  await admin.from("lab_audit_log").insert({
    user_id: user.id,
    session_id: sessionId,
    action: "wallet_enrolled",
    metadata: { tronAddress: tronAddress.slice(0, 6) + "..." },
    ip_address: getClientIp(req),
  });

  return NextResponse.json(wallet, { status: 201 });
}
