import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  assertInstructor,
  generateSessionCode,
  getLabRole,
  logLabAudit,
  getClientIp,
} from "@/lib/labs/lab-guard";
import { FLASH_USDT_TRON_SCENARIO } from "@/lib/labs/scenarios/flash-usdt-tron";
import {
  clampFlashDurationMinutes,
  FLASH_DURATION_MAX_MINUTES,
  FLASH_DURATION_MIN_MINUTES,
} from "@/lib/labs/flash-duration";

/**
 * GET  /api/labs/sessions — list sessions (instructor: own; student: enrolled)
 * POST /api/labs/sessions — create session (instructor only)
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (code) {
    const { data: session } = await supabase
      .from("lab_sessions")
      .select("*")
      .eq("session_code", code.toUpperCase())
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "Código de sesión no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ session });
  }

  const role = await getLabRole(supabase, user.id);

  if (role === "instructor" || role === "admin") {
    const { data: sessions, error } = await supabase
      .from("lab_sessions")
      .select("*")
      .eq("instructor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ sessions, role });
  }

  const { data: enrollments } = await supabase
    .from("lab_wallets")
    .select("session_id")
    .eq("user_id", user.id);

  const sessionIds = (enrollments ?? []).map((e) => e.session_id);
  if (sessionIds.length === 0) {
    return NextResponse.json({ sessions: [], role });
  }

  const { data: sessions, error } = await supabase
    .from("lab_sessions")
    .select("*")
    .in("id", sessionIds)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions, role });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await ensureInstructorAccess(supabase, user.id, user.email);

  const authCheck = await assertInstructor(supabase, user.id);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const body = await req.json();
  const title = String(body.title ?? "Lab Flash USDT").trim();
  const ttlHours = Number(body.ttlHours ?? FLASH_USDT_TRON_SCENARIO.defaultTtlHours);
  const tokenAmount = Number(body.tokenAmount ?? FLASH_USDT_TRON_SCENARIO.defaultAmount);
  const maxParticipants = Number(body.maxParticipants ?? 30);
  const injectionMode = body.injectionMode === "pending_flash" ? "pending_flash" : "fake_token";
  const flashDurationMinutes = clampFlashDurationMinutes(
    Number(body.flashDurationMinutes ?? (injectionMode === "pending_flash" ? 30 : 60))
  );

  if (injectionMode === "pending_flash") {
    const raw = Number(body.flashDurationMinutes);
    if (raw < FLASH_DURATION_MIN_MINUTES || raw > FLASH_DURATION_MAX_MINUTES) {
      return NextResponse.json(
        {
          error: `flashDurationMinutes debe estar entre ${FLASH_DURATION_MIN_MINUTES} y ${FLASH_DURATION_MAX_MINUTES} (7 días)`,
        },
        { status: 400 }
      );
    }
  }

  const scenario =
    injectionMode === "pending_flash"
      ? { defaultTtlHours: 1, defaultAmount: 50_000 }
      : FLASH_USDT_TRON_SCENARIO;

  const resolvedTtl =
    injectionMode === "pending_flash"
      ? Math.max(1, Math.ceil(flashDurationMinutes / 60))
      : ttlHours;
  const resolvedAmount = tokenAmount || scenario.defaultAmount;

  if (!title) {
    return NextResponse.json({ error: "title es obligatorio" }, { status: 400 });
  }

  let sessionCode = generateSessionCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from("lab_sessions")
      .select("id")
      .eq("session_code", sessionCode)
      .maybeSingle();
    if (!existing) break;
    sessionCode = generateSessionCode();
    attempts++;
  }

  const { data: session, error } = await supabase
    .from("lab_sessions")
    .insert({
      instructor_id: user.id,
      title,
      session_code: sessionCode,
      scenario_type: "flash_usdt_tron",
      status: "open",
      ttl_hours: resolvedTtl,
      token_amount: resolvedAmount,
      max_participants: maxParticipants,
      network: "tron",
      injection_mode: injectionMode,
      flash_duration_minutes: flashDurationMinutes,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logLabAudit(supabase, {
    userId: user.id,
    sessionId: session.id,
    action: "session_created",
    metadata: { title, sessionCode },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(session, { status: 201 });
}

async function ensureInstructorAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email: string | undefined
) {
  const adminEmails = (process.env.LAB_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const role =
    email && adminEmails.includes(email.toLowerCase()) ? "admin" : "instructor";

  await supabase.from("lab_roles").upsert(
    { user_id: userId, role },
    { onConflict: "user_id" }
  );
}
