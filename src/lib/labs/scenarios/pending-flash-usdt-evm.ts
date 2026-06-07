import type { LabScenario } from "../types";
import { OFFICIAL_USDT_EVM, getBlockExplorerUrl } from "@/lib/evm/usdt-canonical";

export const PENDING_FLASH_USDT_EVM_SCENARIO: LabScenario = {
  type: "flash_usdt_evm",
  network: "bsc",
  title: "Flash USDT — Modo tx pendiente (EVM)",
  description:
    "Simula la estafa Flash USDT en EVM: aparece USDT, sube el total $ (pending largo), " +
    "y desaparece al expirar. Más realista que Tron gracias al mempool EVM.",
  defaultTtlHours: 168,
  defaultAmount: 50_000,
  defaultFlashDurationMinutes: 1440,
  consentVersion: "2.1",
  injectionMode: "pending_flash",
  steps: [
    {
      id: "check_wallet_pending",
      title: "Abre tu wallet INMEDIATAMENTE",
      description:
        "Abre Trust Wallet en la red del lab (BSC/Polygon). Deberías ver subir el saldo USDT " +
        "y el total en dólares (cebo pending del USDT oficial — en EVM puede durar horas). " +
        "Anota el total $ ANTES de que desaparezca.",
      type: "info",
      maxScore: 10,
    },
    {
      id: "wait_disappear",
      title: "Espera y observa si desaparece",
      description:
        "En estafas reales el saldo 'flash' desaparece: la tx pending falla " +
        "o el crédito fantasma expira. Comprueba si el total $ vuelve al valor anterior.",
      type: "info",
      maxScore: 10,
    },
    {
      id: "explorer_tx_status",
      title: "Verifica el estado en el explorador",
      description:
        "Busca la transacción en BscScan/Polygonscan. Verás 'Pending', 'Failed' " +
        "o una transferencia de un contrato que NO es el USDT oficial de Tether.",
      type: "link",
      linkTemplate: `${getBlockExplorerUrl()}/address/{wallet}`,
      maxScore: 15,
    },
    {
      id: "compare_contract",
      title: "Compara contratos",
      description:
        `El USDT real de Tether es SIEMPRE: ${OFFICIAL_USDT_EVM.contractAddress}. ` +
        "Copia el contrato del token que ves en tu wallet.",
      type: "input",
      maxScore: 25,
    },
    {
      id: "pending_quiz",
      title: "¿Confiarías en un USDT pending?",
      description: "Un estafador cuenta con que confíes antes de que la tx confirme.",
      type: "quiz",
      maxScore: 20,
      quizOptions: [
        { id: "a", label: "Sí, si aparece en mi wallet", correct: false },
        { id: "b", label: "No — solo confío tras Success en explorador + contrato oficial", correct: true },
        { id: "c", label: "Sí, si el total de la wallet subió", correct: false },
        { id: "d", label: "Sí, pending es lo mismo que recibido", correct: false },
      ],
    },
    {
      id: "send_quiz",
      title: "¿Qué harías si te piden devolver 'el exceso'?",
      description: "Patrón clásico: te envían USDT flash y piden que devuelvas parte en USDT real.",
      type: "quiz",
      maxScore: 20,
      quizOptions: [
        { id: "a", label: "Devolvería el exceso para quedar bien", correct: false },
        { id: "b", label: "Nunca envío fondos reales por un saldo no verificado", correct: true },
        { id: "c", label: "Enviaría una parte pequeña para probar", correct: false },
        { id: "d", label: "Compartiría mi seed para 'sincronizar'", correct: false },
      ],
    },
  ],
};

export const PENDING_LAB_CONSENT_TEXT = `AVISO LEGAL — LABORATORIO FLASH USDT (MODO PENDIENTE EVM)

Simulación avanzada de estafa "Flash USDT" con transacciones pending en EVM.
El total $ de tu wallet puede subir temporalmente sin que recibas USDT real.

• Wallet de laboratorio vacía obligatoria.
• Red correcta (BSC/Polygon) según indique el instructor.
• Uso educativo exclusivo.
• Los saldos desaparecerán al expirar la sesión.

¿Aceptas participar en esta simulación controlada?`;
