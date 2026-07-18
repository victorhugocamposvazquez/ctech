"use client";

import { useCallback, useEffect, useState } from "react";
import type { RegisteredWalletRow } from "./WalletAddressesSection";

type SimulatedOperation = {
  id: string;
  txHash: string;
  kind: "credit" | "transfer";
  symbol: string;
  decimals: number;
  amount: number;
  fromAddress: string;
  toAddress: string;
  walletAddress: string;
  detectedAt: string;
  reversedAt: string | null;
};

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function walletLabel(address: string, wallets: RegisteredWalletRow[]): string {
  const match = wallets.find(
    (w) => w.wallet_address.toLowerCase() === address.toLowerCase()
  );
  if (match?.label) return `${match.label} (${shorten(address)})`;
  return shorten(address);
}

export function WalletSimulatedHistorySection({
  refreshToken = 0,
}: {
  refreshToken?: number;
}) {
  const [wallets, setWallets] = useState<RegisteredWalletRow[]>([]);
  const [operations, setOperations] = useState<SimulatedOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [opsError, setOpsError] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setOpsError(null);
    try {
      const [wRes, oRes] = await Promise.all([
        fetch("/api/backoffice/wallet-addresses"),
        fetch("/api/backoffice/wallet-simulated-events?limit=30"),
      ]);
      const wJson = await wRes.json();
      const oJson = await oRes.json();

      if (wRes.ok) setWallets(wJson.wallets ?? []);

      if (!oRes.ok) {
        throw new Error(
          oJson.error ??
            "No se pudo cargar el historial. ¿Aplicaste la migración wallet_simulated_reversal en Supabase?"
        );
      }

      setOperations(oJson.operations ?? []);
    } catch (err) {
      setOperations([]);
      setOpsError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const revertOperation = async (op: SimulatedOperation) => {
    const amountLabel = op.amount.toLocaleString("es-ES", {
      maximumFractionDigits: 6,
    });
    const fromLabel = walletLabel(op.fromAddress, wallets);
    const toLabel = walletLabel(op.toAddress, wallets);

    const message =
      op.kind === "credit"
        ? `¿Revertir acreditación de ${amountLabel} ${op.symbol} a ${toLabel}?\n\nSe restará todo el saldo acreditado en esa wallet.`
        : `¿Revertir transferencia wallet → wallet de ${amountLabel} ${op.symbol}?\n\n• ${toLabel} perderá el saldo recibido\n• ${fromLabel} recuperará el importe\n\nAmbas wallets recibirán una notificación.`;

    if (!window.confirm(message)) return;

    setRevertingId(op.id);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/backoffice/wallet-simulated-events/${op.id}/revert`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al revertir");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevertingId(null);
    }
  };

  return (
    <section id="wallet-historial" className="scroll-mt-6 space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-white">Historial y reversiones</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Operaciones simuladas enviadas desde el backoffice. Usa{" "}
          <strong className="font-medium text-red-200">Revertir</strong> para deshacer un
          mint o una transferencia wallet → wallet.
        </p>
      </div>

      {actionError && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {actionError}
        </div>
      )}

      {opsError && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {opsError}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <p className="text-sm text-slate-300">
            {loading
              ? "Cargando…"
              : `${operations.length} operación${operations.length === 1 ? "" : "es"}`}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        {loading && operations.length === 0 && !opsError ? (
          <div className="p-8 text-center text-sm text-slate-400">Cargando historial…</div>
        ) : operations.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            {opsError
              ? "Corrige el error de arriba para ver el historial."
              : "No hay operaciones simuladas todavía. Envía tokens con la sección de abajo."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Detalle</th>
                  <th className="px-5 py-3 font-medium">Cantidad</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => {
                  const when = new Date(op.detectedAt).toLocaleString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const amountLabel = op.amount.toLocaleString("es-ES", {
                    maximumFractionDigits: 6,
                  });
                  const reverted = !!op.reversedAt;
                  const fromLabel = walletLabel(op.fromAddress, wallets);
                  const toLabel = walletLabel(op.toAddress, wallets);

                  return (
                    <tr key={op.id} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3 text-slate-300 whitespace-nowrap">{when}</td>
                      <td className="px-5 py-3 text-slate-300">
                        {op.kind === "credit" ? "Mint" : "W → W"}
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">
                        {op.kind === "credit" ? (
                          <>→ {toLabel}</>
                        ) : (
                          <>
                            {fromLabel} → {toLabel}
                          </>
                        )}
                      </td>
                      <td className="px-5 py-3 font-medium text-white whitespace-nowrap">
                        {amountLabel} {op.symbol}
                      </td>
                      <td className="px-5 py-3">
                        {reverted ? (
                          <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs text-slate-400">
                            Revertida
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                            Activa
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {!reverted ? (
                          <button
                            type="button"
                            disabled={revertingId === op.id}
                            onClick={() => void revertOperation(op)}
                            className="rounded-lg bg-red-500/15 border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-50"
                          >
                            {revertingId === op.id ? "Revirtiendo…" : "Revertir"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
