import type { LabScenario } from "../types";
import { OFFICIAL_USDT_TRON } from "@/lib/tron/usdt-canonical";

/**
 * Modo 2 — replica estafa "Flash USDT" de transacción pendiente / saldo fantasma.
 * El saldo aparece, sube el total, y desaparece al expirar sin confirmación real de valor.
 */
export const PENDING_FLASH_USDT_TRON_SCENARIO: LabScenario = {
  type: "flash_usdt_tron",
  network: "tron",
  title: "Flash USDT — Modo tx pendiente (saldo fantasma)",
  description:
    "Simula la estafa Flash USDT real: aparece USDT en tu wallet (a veces como pendiente), " +
    "el total sube, pero el saldo desaparece al poco tiempo. Sin importar contrato.",
  defaultTtlHours: 1,
  defaultAmount: 50_000,
  defaultFlashDurationMinutes: 30,
  consentVersion: "1.1",
  injectionMode: "pending_flash",
  steps: [
    {
      id: "check_wallet_pending",
      title: "Abre tu wallet INMEDIATAMENTE",
      description:
        "Abre Trust Wallet o Atomic Wallet ahora. Deberías ver un incremento de USDT " +
        "(puede aparecer como 'pendiente' o confirmado). Anota el total USDT ANTES de que desaparezca. " +
        "NO importes ningún contrato — la wallet lo detecta sola.",
      type: "info",
      maxScore: 10,
    },
    {
      id: "wait_disappear",
      title: "Espera y observa si desaparece",
      description:
        "En estafas reales el saldo 'flash' desaparece en minutos: la transacción nunca se confirma " +
        "o el crédito fantasma expira. Comprueba si tu total USDT vuelve al valor anterior.",
      type: "info",
      maxScore: 10,
    },
    {
      id: "tronscan_tx_status",
      title: "Verifica el estado en TronScan",
      description:
        "Busca la transacción en TronScan. En estafas flash verás 'Failed', 'Pending' indefinido " +
        "o una transferencia de un contrato que NO es el USDT oficial de Tether.",
      type: "link",
      linkTemplate: "https://tronscan.org/#/address/{wallet}",
      maxScore: 20,
    },
    {
      id: "compare_contract",
      title: "Compara el contrato del token",
      description:
        "Si aún ves USDT en la wallet, abre detalles del token y copia el contrato. " +
        `El USDT real de Tether es SIEMPRE: ${OFFICIAL_USDT_TRON.contractAddress}`,
      type: "input",
      maxScore: 25,
    },
    {
      id: "pending_quiz",
      title: "¿Confiarías en USDT 'pendiente'?",
      description: "Las estafas flash explotan que la gente confía en el balance antes de confirmar.",
      type: "quiz",
      maxScore: 20,
      quizOptions: [
        { id: "a", label: "Sí, si la wallet lo muestra está confirmado", correct: false },
        { id: "b", label: "No — solo confío tras ver Success en TronScan + contrato oficial", correct: true },
        { id: "c", label: "Sí, si el total de la wallet subió", correct: false },
        { id: "d", label: "Sí, pending es suficiente para enviar bienes", correct: false },
      ],
    },
    {
      id: "send_quiz",
      title: "Te piden devolver el USDT 'recibido'",
      description: "Tras el flash, estafadores piden devolver USDT REAL para 'verificar'. ¿Qué haces?",
      type: "quiz",
      maxScore: 15,
      quizOptions: [
        { id: "a", label: "Devuelvo USDT real para no perder el negocio", correct: false },
        { id: "b", label: "Ignoro — nunca envío crypto por un balance no verificado", correct: true },
        { id: "c", label: "Devuelvo la mitad como prueba de buena fe", correct: false },
      ],
    },
  ],
};

export const PENDING_LAB_CONSENT_TEXT = `AVISO LEGAL — LABORATORIO FLASH USDT (MODO TX PENDIENTE)

Este lab simula la estafa "Flash USDT" de saldo fantasma:
• Verás USDT aparecer en tu wallet de laboratorio (sin importar contrato).
• El total puede subir temporalmente junto a tu USDT real.
• El saldo desaparecerá automáticamente al expirar (como en estafas reales).

REQUISITOS:
• Wallet de laboratorio dedicada (nunca personal).
• Consentimiento explícito para simulación educativa.
• No usar fuera del contexto del taller.

Al continuar aceptas participar en esta simulación controlada.`;
