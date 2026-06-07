import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildVerificationReport,
  evaluateStep,
  getScenarioSteps,
  getStepById,
} from "@/lib/labs/verification-checklist";
import { getSessionForUser, logLabAudit, getClientIp } from "@/lib/labs/lab-guard";
import type { LabInjectionMode } from "@/lib/labs/types";
import { OFFICIAL_USDT_EVM } from "@/lib/evm/usdt-canonical";
import { isLabEvmReady } from "@/lib/evm/flash-usdt-lab";
import { getLabContractAddress } from "@/lib/evm/client";

/**
 * GET  /api/labs/flash-usdt/verify?sessionId= — steps + progress + report
 * POST /api/labs/flash-usdt/verify — submit step response
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
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId es obligatorio" }, { status: 400 });
  }

  const access = await getSessionForUser(supabase, sessionId, user.id);
  if (!access.session) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const injectionMode = (access.session.injection_mode ?? "fake_token") as LabInjectionMode;
  const steps = getScenarioSteps(injectionMode);
  const { data: completions } = await supabase
    .from("lab_step_completions")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  const stepResults = (completions ?? []).map((c) => ({
    stepId: c.step_id,
    score: c.score,
    maxScore: steps.find((s) => s.id === c.step_id)?.maxScore ?? 0,
    correct: c.score > 0,
    feedback: "",
  }));

  const report = buildVerificationReport(stepResults);

  const labContract = isLabEvmReady()
    ? getLabContractAddress()
    : process.env.EVM_FLASH_USDT_LAB_CONTRACT ?? "PENDIENTE_DESPLIEGUE";

  return NextResponse.json({
    steps,
    injectionMode,
    completions: completions ?? [],
    report,
    comparison: {
      official: OFFICIAL_USDT_EVM,
      lab: {
        contractAddress: labContract,
        note:
          injectionMode === "pending_flash"
            ? "Saldo flash temporal — desaparece al expirar sin valor real"
            : "Contrato del token falso inyectado en el lab",
      },
    },
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const sessionId = String(body.sessionId ?? "").trim();
  const stepId = String(body.stepId ?? "").trim();
  const response = (body.response ?? {}) as Record<string, unknown>;

  if (!sessionId || !stepId) {
    return NextResponse.json(
      { error: "sessionId y stepId son obligatorios" },
      { status: 400 }
    );
  }

  const access = await getSessionForUser(supabase, sessionId, user.id);
  if (!access.session) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const injectionMode = (access.session.injection_mode ?? "fake_token") as LabInjectionMode;
  const step = getStepById(stepId, injectionMode);
  if (!step) {
    return NextResponse.json({ error: "Paso no encontrado" }, { status: 404 });
  }

  const result = evaluateStep(step, response);

  const { error } = await supabase.from("lab_step_completions").upsert(
    {
      session_id: sessionId,
      user_id: user.id,
      step_id: stepId,
      response,
      score: result.score,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "session_id,user_id,step_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: allCompletions } = await supabase
    .from("lab_step_completions")
    .select("step_id, score")
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  const steps = getScenarioSteps(injectionMode);
  const stepResults = (allCompletions ?? []).map((c) => {
    const s = steps.find((st) => st.id === c.step_id);
    return {
      stepId: c.step_id,
      score: c.score,
      maxScore: s?.maxScore ?? 0,
      correct: c.score >= (s?.maxScore ?? 0) * 0.5,
      feedback: c.step_id === stepId ? result.feedback : "",
    };
  });

  const report = buildVerificationReport(stepResults);

  await logLabAudit(supabase, {
    userId: user.id,
    sessionId,
    action: "step_completed",
    metadata: { stepId, score: result.score },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ result, report });
}
