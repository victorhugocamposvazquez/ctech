"use client";

import { useCallback, useEffect, useState } from "react";

type Session = {
  id: string;
  title: string;
  session_code: string;
  status: string;
  ttl_hours: number;
  token_amount: number;
  network?: string;
  injection_mode?: "fake_token" | "pending_flash";
  flash_duration_minutes?: number;
};

type LabStep = {
  id: string;
  title: string;
  description: string;
  type: string;
  maxScore: number;
  quizOptions?: { id: string; label: string }[];
  linkTemplate?: string;
};

type UsdtOverview = {
  officialBalance: string;
  labBalance: string;
  flashBalance?: string;
  totalDisplayed: string;
  estimatedWalletFiatUsd?: string;
  pendingBaitAmount?: string;
  pendingBaitActive?: boolean;
  autoDetected: boolean;
  requiresImport: boolean;
  flashActive?: boolean;
  flashExpiresAt?: string;
  simulated?: boolean;
};

type Props = {
  session: Session;
  isInstructor: boolean;
  onRefresh: () => void;
};

export default function FlashUSDTLab({ session, isInstructor, onRefresh }: Props) {
  const [phase, setPhase] = useState<"enroll" | "waiting" | "lab" | "done">("enroll");
  const [consentText, setConsentText] = useState("");
  const [consentVersion, setConsentVersion] = useState("1.0");
  const [walletAddress, setWalletAddress] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [steps, setSteps] = useState<LabStep[]>([]);
  const [report, setReport] = useState<{ percentage: number; passed: boolean; totalScore: number; maxScore: number } | null>(null);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [contractInput, setContractInput] = useState("");
  const [quizSelection, setQuizSelection] = useState("");
  const [stepFeedback, setStepFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [injecting, setInjecting] = useState(false);

  const isPendingMode = session.injection_mode === "pending_flash";
  const sessionNetwork = (session.network ?? "bsc").toLowerCase();
  const networkLabel =
    sessionNetwork === "ethereum"
      ? "Ethereum"
      : sessionNetwork === "polygon"
        ? "Polygon"
        : "BSC";

  const loadEnroll = useCallback(async () => {
    const res = await fetch(`/api/labs/sessions/${session.id}/enroll`);
    const data = await res.json();
    if (res.ok) {
      setConsentText(data.consentText ?? "");
      setConsentVersion(data.consentVersion ?? "1.0");
      if (data.enrolled) {
        setEnrolled(true);
        setWalletAddress(data.enrolled.wallet_address);
        const injected =
          data.session.status === "injected" ||
          data.session.status === "expired";
        setPhase(injected ? "lab" : "waiting");
      }
    }
  }, [session.id]);

  const loadStatus = useCallback(async () => {
    const res = await fetch(`/api/labs/flash-usdt/status?sessionId=${session.id}`);
    const data = await res.json();
    if (res.ok) {
      setStatus(data);
      const injStatus = data.injection?.status;
      if (injStatus === "injected" || injStatus === "pending_flash") setPhase("lab");
      if (data.report?.passed) setPhase("done");
    }
    return data;
  }, [session.id]);

  const loadVerify = useCallback(async () => {
    const res = await fetch(`/api/labs/flash-usdt/verify?sessionId=${session.id}`);
    const data = await res.json();
    if (res.ok) {
      setSteps(data.steps ?? []);
      setReport(data.report ?? null);
      if (data.report?.passed) setPhase("done");
    }
  }, [session.id]);

  useEffect(() => {
    loadEnroll();
    loadStatus();
    loadVerify();
  }, [loadEnroll, loadStatus, loadVerify]);

  useEffect(() => {
    if (phase !== "waiting" && phase !== "lab") return;
    const ms = isPendingMode ? 3000 : 5000;
    const interval = setInterval(loadStatus, ms);
    return () => clearInterval(interval);
  }, [phase, loadStatus, isPendingMode]);

  async function handleEnroll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/labs/sessions/${session.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          consentAccepted,
          consentVersion,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnrolled(true);
      setPhase("waiting");
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleInject() {
    setInjecting(true);
    setError(null);
    try {
      const res = await fetch("/api/labs/flash-usdt/inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadStatus();
      setPhase("lab");
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setInjecting(false);
    }
  }

  async function submitStep(step: LabStep) {
    setLoading(true);
    setStepFeedback(null);
    const response: Record<string, unknown> = {};
    if (step.type === "input") response.contractAddress = contractInput;
    if (step.type === "quiz") response.selectedOptionId = quizSelection;
    if (step.type === "link") response.visited = true;

    try {
      const res = await fetch("/api/labs/flash-usdt/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, stepId: step.id, response }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStepFeedback(data.result.feedback);
      setReport(data.report);
      if (data.report.passed) setPhase("done");
      else if (activeStepIdx < steps.length - 1) {
        setTimeout(() => {
          setActiveStepIdx((i) => i + 1);
          setContractInput("");
          setQuizSelection("");
          setStepFeedback(null);
        }, 1500);
      }
      await loadVerify();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const overview = status?.usdtOverview as UsdtOverview | undefined;
  const txStatus = status?.txStatus as { confirmed?: boolean; pending?: boolean; failed?: boolean } | null;
  const pendingTxStatus = status?.pendingTxStatus as { confirmed?: boolean; pending?: boolean; failed?: boolean } | null;
  const participantProgress = status?.participantProgress as Array<{
    walletAddress: string;
    injectionStatus: string;
    totalScore: number;
    stepsCompleted: number;
  }> | undefined;

  const ttlRemainingMs = status?.ttlRemainingMs as number | null;
  const flashMinutesLeft =
    ttlRemainingMs != null ? Math.max(0, Math.ceil(ttlRemainingMs / 60000)) : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-white">{session.title}</h2>
        <p className="text-sm text-slate-400 mt-1">
          Código: <span className="text-cyan-300 font-mono">{session.session_code}</span>
          {" · "}{networkLabel}
          {" · "}{session.status}
          {" · "}{session.token_amount} USDT
          {isPendingMode
            ? ` · flash ${session.flash_duration_minutes ?? 30} min`
            : ` · TTL ${session.ttl_hours}h`}
          {isPendingMode && (
            <span className="ml-2 text-amber-300">Modo 2 — saldo fantasma</span>
          )}
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {isInstructor && (
        <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4">
          <h3 className="text-sm font-medium text-indigo-100">Panel instructor</h3>
          <p className="text-xs text-indigo-200/70 mt-1">
            {isPendingMode
              ? "Modo 2: flashInject() + cebo pending USDT oficial (gas bajo). " +
                "En EVM el total $ puede mantenerse horas/días en Trust Wallet."
              : "Modo 1: token lab transferido + cebo pending USDT oficial para inflar el total $."}
          </p>
          <button
            type="button"
            onClick={handleInject}
            disabled={injecting || session.status === "expired"}
            className="mt-3 rounded-lg bg-indigo-500/40 border border-indigo-300/40 px-4 py-2 text-sm text-white hover:bg-indigo-500/50 disabled:opacity-50"
          >
            {injecting
              ? "Inyectando…"
              : isPendingMode
                ? "Lanzar Flash USDT (saldo fantasma)"
                : "Simular ataque Flash USDT"}
          </button>
          {participantProgress && participantProgress.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400">
                    <th className="py-1 pr-2">Wallet</th>
                    <th className="py-1 pr-2">Inyección</th>
                    <th className="py-1 pr-2">Pasos</th>
                    <th className="py-1">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {participantProgress.map((p) => (
                    <tr key={p.walletAddress} className="text-slate-300 border-t border-white/5">
                      <td className="py-1.5 pr-2 font-mono">{p.walletAddress.slice(0, 10)}…</td>
                      <td className="py-1.5 pr-2">{p.injectionStatus}</td>
                      <td className="py-1.5 pr-2">{p.stepsCompleted}</td>
                      <td className="py-1.5">{p.totalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {phase === "enroll" && !enrolled && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-xs text-amber-100 whitespace-pre-line max-h-48 overflow-y-auto">
            {consentText || "Cargando consentimiento…"}
          </div>
          <label className="block text-sm text-slate-300">
            Dirección EVM (0x…) — Trust Wallet o MetaMask en {networkLabel}
            <input
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value.trim())}
              placeholder="0x..."
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-1"
            />
            Acepto el consentimiento del laboratorio (v{consentVersion})
          </label>
          <button
            type="button"
            onClick={handleEnroll}
            disabled={loading || !consentAccepted || !walletAddress}
            className="rounded-lg bg-cyan-500/30 border border-cyan-400/40 px-4 py-2 text-sm text-cyan-100 disabled:opacity-50"
          >
            Registrar wallet de laboratorio
          </button>
        </div>
      )}

      {phase === "waiting" && enrolled && (
        <div className="text-center py-8 space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="text-slate-300">Esperando inyección del instructor…</p>
          <p className="text-xs text-slate-500 font-mono">{walletAddress}</p>
        </div>
      )}

      {(phase === "lab" || phase === "done") && (
        <div className="space-y-5">
          {overview && (
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4">
              <h3 className="text-sm font-medium text-cyan-100">Total en tu wallet</h3>
              {overview.estimatedWalletFiatUsd != null && (
                <p className="text-2xl font-bold text-white mt-1">
                  ≈ ${overview.estimatedWalletFiatUsd} USD
                </p>
              )}
              <p className="text-lg font-semibold text-cyan-100 mt-1">
                {overview.totalDisplayed} USDT (saldo visible)
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-cyan-200/80">
                <span>USDT real: {overview.officialBalance}</span>
                <span>
                  {isPendingMode ? "Flash activo" : "USDT lab"}:{" "}
                  {overview.flashBalance ?? overview.labBalance}
                </span>
                {overview.pendingBaitActive && (
                  <span className="col-span-2 text-amber-200">
                    Cebo pending (USDT oficial verificado): +{overview.pendingBaitAmount} USD en total wallet
                  </span>
                )}
              </div>
              {isPendingMode && overview.flashActive && flashMinutesLeft != null && (
                <p className="mt-2 text-sm text-amber-200 animate-pulse">
                  ⏳ El saldo flash desaparecerá en ~{flashMinutesLeft} min — mira tu wallet AHORA
                </p>
              )}
              {isPendingMode && overview.flashActive === false && (
                <p className="mt-2 text-sm text-red-300">
                  El flash expiró — ¿volvió tu balance al valor anterior? Eso es la estafa.
                </p>
              )}
              {(txStatus || pendingTxStatus) && (
                <div className="mt-2 text-xs text-cyan-200/70 space-y-1">
                  {txStatus && (
                    <p>
                      Tx lab:{" "}
                      {txStatus.confirmed ? "Confirmada" : txStatus.failed ? "Failed" : "Pending"}
                    </p>
                  )}
                  {pendingTxStatus && (
                    <p>
                      Cebo USDT oficial (fee bajo):{" "}
                      {pendingTxStatus.pending
                        ? "Pending — infla el total $ de la wallet"
                        : pendingTxStatus.failed
                          ? "Failed — el total $ vuelve a bajar"
                          : "Confirmada"}
                    </p>
                  )}
                </div>
              )}
              <p className="mt-2 text-xs text-cyan-200/60">
                {overview.autoDetected && !overview.requiresImport
                  ? "Detectado automáticamente — no hace falta importar contrato. "
                  : ""}
                {overview.pendingBaitActive
                  ? "Cebo USDT oficial activo — el total $ se renueva cada ~15 min mientras dure la sesión. "
                  : ""}
                Para máxima duración del total $: Trust Wallet o MetaMask en {networkLabel} (misma red que el instructor).
                {overview.simulated ? " (modo simulado)" : ""}
              </p>
            </div>
          )}

          {phase === "lab" && steps.length > 0 && (
            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Paso {activeStepIdx + 1} / {steps.length}
              </p>
              {(() => {
                const step = steps[activeStepIdx];
                if (!step) return null;
                return (
                  <div className="mt-2 space-y-3">
                    <h4 className="text-white font-medium">{step.title}</h4>
                    <p className="text-sm text-slate-400">{step.description}</p>
                    {step.type === "input" && (
                      <input
                        value={contractInput}
                        onChange={(e) => setContractInput(e.target.value)}
                        placeholder="Pega la dirección del contrato del token USDT que ves"
                        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-mono"
                      />
                    )}
                    {step.type === "link" && step.linkTemplate && (
                      <a
                        href={step.linkTemplate.replace("{wallet}", walletAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-sm text-cyan-300 underline"
                      >
                        Abrir explorador →
                      </a>
                    )}
                    {step.type === "quiz" && step.quizOptions && (
                      <div className="space-y-2">
                        {step.quizOptions.map((opt) => (
                          <label key={opt.id} className="flex items-center gap-2 text-sm text-slate-300">
                            <input
                              type="radio"
                              name={`quiz-${step.id}`}
                              value={opt.id}
                              checked={quizSelection === opt.id}
                              onChange={() => setQuizSelection(opt.id)}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    )}
                    {stepFeedback && (
                      <p className="text-sm text-emerald-300">{stepFeedback}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => submitStep(step)}
                      disabled={loading}
                      className="rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
                    >
                      {loading ? "Enviando…" : "Completar paso"}
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {phase === "done" && report && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
              <h3 className="text-lg font-semibold text-emerald-100">Lab completado</h3>
              <p className="text-3xl font-bold text-white mt-2">{report.percentage}%</p>
              <p className="text-sm text-emerald-200/80 mt-1">
                {report.totalScore} / {report.maxScore} puntos
                {report.passed ? " — Aprobado" : " — Revisa los pasos"}
              </p>
              <ComparisonPanel sessionId={session.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ComparisonPanel({ sessionId }: { sessionId: string }) {
  const [comparison, setComparison] = useState<{
    official: { contractAddress: string; name: string; issuer: string };
    lab: { contractAddress: string; note: string };
  } | null>(null);

  useEffect(() => {
    fetch(`/api/labs/flash-usdt/verify?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((d) => setComparison(d.comparison ?? null));
  }, [sessionId]);

  if (!comparison) return null;

  return (
    <div className="mt-6 grid sm:grid-cols-2 gap-3 text-left text-xs">
      <div className="rounded-lg border border-emerald-400/20 bg-black/20 p-3">
        <p className="text-emerald-300 font-medium">USDT REAL (Tether)</p>
        <p className="text-slate-400 mt-1 font-mono break-all">{comparison.official.contractAddress}</p>
        <p className="text-slate-500 mt-1">Emisor: {comparison.official.issuer}</p>
      </div>
      <div className="rounded-lg border border-red-400/20 bg-black/20 p-3">
        <p className="text-red-300 font-medium">USDT FALSO (Lab)</p>
        <p className="text-slate-400 mt-1 font-mono break-all">{comparison.lab.contractAddress}</p>
        <p className="text-slate-500 mt-1">{comparison.lab.note}</p>
      </div>
    </div>
  );
}
