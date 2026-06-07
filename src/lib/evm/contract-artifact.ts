import artifact from "./artifacts/FlashUSDTLab.json";
import type { Abi } from "viem";

export type FlashUsdTLabArtifact = {
  contractName: string;
  compilerVersion: string;
  optimizationRuns: number;
  abi: Abi;
  bytecode: `0x${string}`;
};

export function getFlashUsdTLabArtifact(): FlashUsdTLabArtifact {
  return artifact as FlashUsdTLabArtifact;
}
