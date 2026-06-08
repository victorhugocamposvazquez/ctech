import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const solc = require("solc");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_PATH = join(root, "contracts/evm/FlashUSDTLab.sol");
const OUT_PATH = join(root, "src/lib/evm/artifacts/FlashUSDTLab.json");
const CONTRACT_NAME = "FlashUSDTLab";
const OPTIMIZATION_RUNS = 200;

const source = readFileSync(SOURCE_PATH, "utf8");

const input = {
  language: "Solidity",
  sources: { "FlashUSDTLab.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: OPTIMIZATION_RUNS },
    outputSelection: {
      "*": { "*": ["abi", "evm.bytecode.object"] },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const fatal = output.errors.filter((e) => e.severity === "error");
  for (const e of output.errors) console.log(e.formattedMessage);
  if (fatal.length) {
    console.error("Compilación fallida");
    process.exit(1);
  }
}

const contract = output.contracts["FlashUSDTLab.sol"][CONTRACT_NAME];
const artifact = {
  contractName: CONTRACT_NAME,
  compilerVersion: `v${solc.version().replace(".Emscripten.clang", "")}`,
  optimizationRuns: OPTIMIZATION_RUNS,
  abi: contract.abi,
  bytecode: `0x${contract.evm.bytecode.object}`,
};

writeFileSync(OUT_PATH, JSON.stringify(artifact));
console.log("OK ->", OUT_PATH);
console.log("compilerVersion:", artifact.compilerVersion);
console.log("bytecode length:", artifact.bytecode.length);
