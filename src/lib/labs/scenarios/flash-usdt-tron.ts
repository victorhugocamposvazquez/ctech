import type { LabScenario } from "../types";
import { OFFICIAL_USDT_TRON } from "@/lib/tron/usdt-canonical";

export const FLASH_USDT_TRON_SCENARIO: LabScenario = {
  type: "flash_usdt_tron",
  network: "tron",
  title: "Flash USDT — Detección de stablecoin falso",
  description:
    "Simula la recepción de USDT falso en tu wallet de laboratorio Tron. " +
    "Aprende a distinguir tokens legítimos de imitaciones usadas en estafas.",
  defaultTtlHours: 24,
  defaultAmount: 10_000,
  consentVersion: "1.0",
  injectionMode: "fake_token",
  steps: [
    {
      id: "check_wallet",
      title: "Revisa tu wallet — sin importar nada",
      description:
        "Abre Trust Wallet o Atomic Wallet. NO necesitas importar ningún contrato manualmente: " +
        "la transferencia TRC-20 entrante se detecta sola y el saldo USDT se suma al total " +
        "junto con tu USDT real (si tienes). Comprueba que el total USDT ha aumentado.",
      type: "info",
      maxScore: 5,
    },
    {
      id: "compare_contract",
      title: "Compara la dirección del contrato",
      description:
        "En tu wallet, abre los detalles del token USDT y copia la dirección del contrato. " +
        `El USDT oficial en Tron es: ${OFFICIAL_USDT_TRON.contractAddress}`,
      type: "input",
      maxScore: 25,
    },
    {
      id: "tronscan_check",
      title: "Verifica en TronScan",
      description:
        "Abre TronScan y revisa el contrato del token. Comprueba si está verificado " +
        "y quién lo emitió.",
      type: "link",
      linkTemplate: "https://tronscan.org/#/address/{wallet}",
      maxScore: 15,
    },
    {
      id: "liquidity_check",
      title: "Comprueba liquidez en DEX",
      description:
        "Un USDT falso no tendrá liquidez real en SunSwap ni podrás intercambiarlo " +
        "por TRX u otros activos.",
      type: "info",
      maxScore: 10,
    },
    {
      id: "issuer_quiz",
      title: "¿Quién emite el USDT real?",
      description: "Selecciona la respuesta correcta sobre el emisor de USDT en Tron.",
      type: "quiz",
      maxScore: 20,
      quizOptions: [
        { id: "a", label: "Cualquier dirección que transfiera tokens", correct: false },
        { id: "b", label: "Tether Limited (contrato verificado TR7NHq...)", correct: true },
        { id: "c", label: "Trust Wallet automáticamente", correct: false },
        { id: "d", label: "SunSwap DEX", correct: false },
      ],
    },
    {
      id: "send_quiz",
      title: "¿Enviarías este USDT a un tercero?",
      description:
        "Un estafador puede pedirte que envíes USDT para 'verificar' tu wallet. " +
        "¿Qué harías con un USDT inesperado?",
      type: "quiz",
      maxScore: 25,
      quizOptions: [
        { id: "a", label: "Sí, para completar la verificación", correct: false },
        { id: "b", label: "No — primero verifico el contrato y nunca envío a desconocidos", correct: true },
        { id: "c", label: "Sí, si el balance parece real", correct: false },
        { id: "d", label: "Sí, si la wallet lo muestra como USDT", correct: false },
      ],
    },
  ],
};

export const LAB_CONSENT_TEXT = `AVISO LEGAL — LABORATORIO DE SEGURIDAD CRYPTO

Este laboratorio simula un ataque real de "Flash USDT": recibirás tokens TRC-20 
que imitan USDT en una wallet de TRABAJO dedicada al lab.

REQUISITOS OBLIGATORIOS:
• Usa SOLO una wallet de laboratorio vacía (nunca tu wallet personal).
• Aceptas que se inyecten tokens falsos con fines exclusivamente educativos.
• Los tokens serán eliminados (burn) automáticamente al expirar la sesión.
• No intentarás usar estos tokens fuera del contexto del laboratorio.

CTech y los instructores no se responsabilizan del uso indebido de esta herramienta.
Al continuar, confirmas que entiendes que esto es una simulación controlada.`;
