"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clampFlashDurationMinutes,
  FLASH_DURATION_MAX_MINUTES,
  FLASH_DURATION_MIN_MINUTES,
} from "@/lib/labs/flash-duration";
import FlashUSDTLab from "./FlashUSDTLab";
import EvmTreasuryPanel from "./EvmTreasuryPanel";
import EvmContractsPanel from "./EvmContractsPanel";

type LabRole = "student" | "instructor" | "admin";

type LabSession = {
  id: string;
  title: string;
  session_code: string;
  status: string;
  ttl_hours: number;
  token_amount: number;
  max_participants: number;
  network?: string;
  created_at: string;
  injection_mode?: "fake_token" | "pending_flash";
  flash_duration_minutes?: number;
};

type EvmNetworkOption = {
  id: string;
  label: string;
  shortLabel: string;
  configured: boolean;
};

type InjectionMode = "fake_token" | "pending_flash";

export default function SecurityLabConsole() {
  const [role, setRole] = useState<LabRole>("student");
  const [canBecomeInstructor, setCanBecomeInstructor] = useState(false);
  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("Lab Flash USDT — BSC");
  const [newNetwork, setNewNetwork] = useState("bsc");
  const [evmNetworks, setEvmNetworks] = useState<EvmNetworkOption[]>([]);
  const [newTtl, setNewTtl] = useState(168);
  const [newAmount, setNewAmount] = useState(10000);
  const [newMode, setNewMode] = useState<InjectionMode>("pending_flash");
  const [newFlashMinutes, setNewFlashMinutes] = useState(30);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleRes, sessionsRes, evmRes] = await Promise.all([
        fetch("/api/labs/role"),
        fetch("/api/labs/sessions"),
        fetch("/api/labs/evm-config"),
      ]);
      const roleData = await roleRes.json();
      const sessionsData = await sessionsRes.json();
      const evmData = evmRes.ok ? await evmRes.json() : null;
      if (!roleRes.ok) throw new Error(roleData.error ?? "Error cargando rol");
      if (!sessionsRes.ok) throw new Error(sessionsData.error ?? "Error cargando sesiones");
      setRole(roleData.role);
      setCanBecomeInstructor(roleData.canBecomeInstructor);
      setSessions(sessionsData.sessions ?? []);
      if (evmData?.networks) {
        setEvmNetworks(evmData.networks);
        if (evmData.defaultNetwork) {
          setNewNetwork(evmData.defaultNetwork);
        }
      }
      if (!activeSessionId && sessionsData.sessions?.length) {
        setActiveSessionId(sessionsData.sessions[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [activeSessionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createSession() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/labs/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          network: newNetwork,
          ttlHours: newMode === "pending_flash" ? 1 : newTtl,
          tokenAmount: newAmount,
          injectionMode: newMode,
          flashDurationMinutes: clampFlashDurationMinutes(newFlashMinutes),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error creando sesión");
      setActiveSessionId(data.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  async function joinByCode() {
    if (!joinCode.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/labs/sessions?code=${encodeURIComponent(joinCode.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Código inválido");
      setActiveSessionId(data.session.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const isInstructor = role === "instructor" || role === "admin";
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  if (loading && sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">
        Cargando laboratorios…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canBecomeInstructor && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
          <p className="font-medium text-white mb-2">Flujo instructor</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Treasury — wallet + private key + BNB/ETH para gas</li>
            <li>Infra EVM — desplegar contrato FlashUSDTLab (BSC recomendado)</li>
            <li>Crear sesión abajo — elige la misma red que el contrato</li>
            <li>Selecciona la sesión → registrar wallet MetaMask → Inyectar Flash USDT</li>
          </ol>
        </div>
      )}
      {canBecomeInstructor && <EvmTreasuryPanel visible={canBecomeInstructor} />}
      {canBecomeInstructor && <EvmContractsPanel visible={canBecomeInstructor} />}

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-sm font-semibold text-white">Unirse a sesión</h2>
            <p className="mt-1 text-xs text-slate-400">
              Introduce el código que te dio el instructor
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Código 8 chars"
                className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={joinByCode}
                className="rounded-lg bg-cyan-500/20 border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/30"
              >
                Unirse
              </button>
            </div>
          </div>

          {canBecomeInstructor && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-sm font-semibold text-white">Crear sesión (instructor)</h2>
              <div className="mt-3 space-y-3">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                  placeholder="Título"
                />
                <label className="text-xs text-slate-400 block">
                  Red blockchain
                  <select
                    value={newNetwork}
                    onChange={(e) => {
                      const net = e.target.value;
                      setNewNetwork(net);
                      const label =
                        evmNetworks.find((n) => n.id === net)?.shortLabel ?? net.toUpperCase();
                      setNewTitle((prev) =>
                        prev.replace(/\((BSC|ETH|POL|Ethereum|BSC)\)|— BSC|— Ethereum/gi, "").trim() +
                        ` — ${label}`
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                  >
                    {(evmNetworks.length > 0
                      ? evmNetworks
                      : [
                          { id: "bsc", label: "BNB Smart Chain (BSC)", configured: true },
                          { id: "ethereum", label: "Ethereum", configured: true },
                        ]
                    ).map((n) => (
                      <option key={n.id} value={n.id} disabled={!n.configured}>
                        {n.label}
                        {!n.configured ? " (no configurada)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-400 block">
                  Modo de estafa
                  <select
                    value={newMode}
                    onChange={(e) => {
                      const mode = e.target.value as InjectionMode;
                      setNewMode(mode);
                      if (mode === "pending_flash") {
                        setNewAmount(50000);
                        setNewTitle("Flash USDT — Saldo fantasma");
                      } else {
                        setNewAmount(10000);
                        setNewTitle("Flash USDT — Token falso");
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                  >
                    <option value="pending_flash">Modo 2 — Tx pendiente / saldo que desaparece</option>
                    <option value="fake_token">Modo 1 — Token falso permanente</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {newMode === "fake_token" ? (
                    <label className="text-xs text-slate-400">
                      TTL (h)
                      <input
                        type="number"
                        value={newTtl}
                        onChange={(e) => setNewTtl(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                      />
                    </label>
                  ) : (
                    <label className="text-xs text-slate-400 col-span-2">
                      Duración flash (min) — máx. {FLASH_DURATION_MAX_MINUTES} (= 30 días)
                      <input
                        type="number"
                        value={newFlashMinutes}
                        onChange={(e) => setNewFlashMinutes(Number(e.target.value))}
                        min={FLASH_DURATION_MIN_MINUTES}
                        max={FLASH_DURATION_MAX_MINUTES}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                      />
                    </label>
                  )}
                  <label className="text-xs text-slate-400">
                    USDT flash
                    <input
                      type="number"
                      value={newAmount}
                      onChange={(e) => setNewAmount(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={createSession}
                  disabled={creating}
                  className="w-full rounded-lg bg-indigo-500/30 border border-indigo-400/40 py-2 text-sm text-indigo-100 hover:bg-indigo-500/40 disabled:opacity-50"
                >
                  {creating ? "Creando…" : "Nueva sesión"}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-sm font-semibold text-white">Mis sesiones</h2>
            <ul className="mt-3 space-y-2">
              {sessions.length === 0 && (
                <li className="text-xs text-slate-500">Sin sesiones activas</li>
              )}
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSessionId(s.id)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${
                      activeSessionId === s.id
                        ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-100"
                        : "hover:bg-white/5 text-slate-300 border border-transparent"
                    }`}
                  >
                    <span className="font-medium">{s.title}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      {s.session_code} · {s.network?.toUpperCase() ?? "BSC"} · {s.status}
                      {s.injection_mode === "pending_flash" ? " · flash" : " · token"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2">
          {activeSession ? (
            <FlashUSDTLab
              session={activeSession}
              isInstructor={isInstructor}
              onRefresh={load}
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">
              Selecciona o únete a una sesión para comenzar el lab Flash USDT
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
