import type { LabStep, StepCompletionResult, VerificationReport } from "./types";
import type { LabInjectionMode, LabNetwork } from "./types";
import { getBlockExplorerUrl, getOfficialUsdtMeta, isOfficialUsdt } from "@/lib/evm/usdt-canonical";
import { getEvmNetworkLabel } from "@/lib/evm/network";
import { getScenarioByMode, getScenarioSteps } from "./scenario-registry";

export { getScenarioSteps };

export function localizeStepsForNetwork(steps: LabStep[], network: LabNetwork): LabStep[] {
  const official = getOfficialUsdtMeta(network);
  const explorer = getBlockExplorerUrl(network);
  const label = getEvmNetworkLabel(network);
  const explorerName =
    network === "bsc" ? "BscScan" : network === "ethereum" ? "Etherscan" : "Polygonscan";
  const dexName = network === "bsc" ? "PancakeSwap" : "Uniswap";

  return steps.map((step) => ({
    ...step,
    description: step.description
      .replace(/0x[a-fA-F0-9]{40}/g, official.contractAddress)
      .replace(/BSC\/Polygon/gi, label)
      .replace(/BscScan\/Polygonscan/gi, explorerName)
      .replace(/PancakeSwap\/Uniswap/gi, dexName),
    linkTemplate: step.linkTemplate
      ? step.linkTemplate.replace(/^https:\/\/[^/]+/, explorer)
      : step.linkTemplate,
  }));
}

export function evaluateStep(
  step: LabStep,
  response: Record<string, unknown>,
  network?: LabNetwork
): StepCompletionResult {
  switch (step.type) {
    case "info":
      return {
        stepId: step.id,
        score: step.maxScore,
        maxScore: step.maxScore,
        correct: true,
        feedback: "Paso completado. Continúa con la verificación.",
      };

    case "input": {
      const contractAddress = String(response.contractAddress ?? "").trim();
      if (!contractAddress) {
        return {
          stepId: step.id,
          score: 0,
          maxScore: step.maxScore,
          correct: false,
          feedback: "Debes introducir la dirección del contrato del token.",
        };
      }
      const isOfficial = isOfficialUsdt(contractAddress, network);
      if (isOfficial) {
        return {
          stepId: step.id,
          score: Math.floor(step.maxScore * 0.4),
          maxScore: step.maxScore,
          correct: false,
          feedback:
            "Has introducido el contrato oficial de USDT. En este lab deberías ver " +
            "una dirección DIFERENTE — o el saldo ya desapareció porque era flash.",
        };
      }
      return {
        stepId: step.id,
        score: step.maxScore,
        maxScore: step.maxScore,
        correct: true,
        feedback:
          "Correcto: el contrato no coincide con el USDT oficial de Tether.",
      };
    }

    case "link": {
      const explorerName =
        network === "bsc"
          ? "BscScan"
          : network === "ethereum"
            ? "Etherscan"
            : network === "polygon"
              ? "Polygonscan"
              : "el explorador de bloques";
      return {
        stepId: step.id,
        score: response.visited ? step.maxScore : Math.floor(step.maxScore * 0.5),
        maxScore: step.maxScore,
        correct: Boolean(response.visited),
        feedback: response.visited
          ? "Has revisado el explorador. Busca estado Failed, Pending o contrato no verificado."
          : `Abre ${explorerName} y verifica el estado de la transacción.`,
      };
    }

    case "quiz": {
      const selectedId = String(response.selectedOptionId ?? "");
      const option = step.quizOptions?.find((o) => o.id === selectedId);
      if (!option) {
        return {
          stepId: step.id,
          score: 0,
          maxScore: step.maxScore,
          correct: false,
          feedback: "Selecciona una respuesta.",
        };
      }
      return {
        stepId: step.id,
        score: option.correct ? step.maxScore : 0,
        maxScore: step.maxScore,
        correct: option.correct,
        feedback: option.correct
          ? "Respuesta correcta."
          : "Respuesta incorrecta. Revisa el material del paso anterior.",
      };
    }

    case "compare":
      return {
        stepId: step.id,
        score: step.maxScore,
        maxScore: step.maxScore,
        correct: true,
        feedback: "Comparación completada.",
      };

    default:
      return {
        stepId: step.id,
        score: 0,
        maxScore: step.maxScore,
        correct: false,
        feedback: "Tipo de paso desconocido.",
      };
  }
}

export function buildVerificationReport(
  stepResults: StepCompletionResult[]
): VerificationReport {
  const totalScore = stepResults.reduce((s, r) => s + r.score, 0);
  const maxScore = stepResults.reduce((s, r) => s + r.maxScore, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passed = percentage >= 70;

  return {
    totalScore,
    maxScore,
    percentage,
    passed,
    stepResults,
  };
}

export function getStepById(stepId: string, mode: LabInjectionMode = "fake_token"): LabStep | undefined {
  return getScenarioByMode(mode).steps.find((s) => s.id === stepId);
}
