/**
 * Crea un pool de precio fUSDT/USDT en PancakeSwap (BSC) para que el token lab
 * tenga precio on-chain (~$1). Wallets que leen precio on-chain (MetaMask,
 * SafePal, Rabby) y DexScreener/GeckoTerminal mostrarán el valor del saldo.
 *
 * NO funciona para Trust Wallet (usa CoinMarketCap → exige listado formal).
 *
 * Uso:
 *   EVM_LAB_TREASURY_PRIVATE_KEY=0x... \
 *   EVM_BSC_FLASH_USDT_LAB_CONTRACT=0x... \
 *   node scripts/create-price-pool.mjs [--usdt 10] [--price 1] [--rpc https://...]
 *
 * Requisitos:
 *   - La treasury (owner del token lab) debe tener BNB para gas y el USDT real
 *     que vas a aportar al pool (p.ej. 10 USDT).
 *   - El token lab debe estar desplegado y su dirección en EVM_BSC_FLASH_USDT_LAB_CONTRACT
 *     (o pásala con --contract).
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";

const LAB_DECIMALS = 6;
const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";
const USDT_DECIMALS = 18;
const ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const RPC = arg("rpc", process.env.EVM_BSC_RPC_URL || "https://bsc-dataseed.binance.org");
const USDT_AMOUNT = Number(arg("usdt", "10"));
const PRICE = Number(arg("price", "1")); // USDT por fUSDT
const CONTRACT = arg("contract", process.env.EVM_BSC_FLASH_USDT_LAB_CONTRACT);
let PK = process.env.EVM_LAB_TREASURY_PRIVATE_KEY || "";

if (!CONTRACT) {
  console.error("Falta el contrato lab. Usa --contract 0x... o EVM_BSC_FLASH_USDT_LAB_CONTRACT");
  process.exit(1);
}
if (!PK) {
  console.error("Falta EVM_LAB_TREASURY_PRIVATE_KEY");
  process.exit(1);
}
if (!PK.startsWith("0x")) PK = `0x${PK}`;

// fUSDT a aportar para que el precio sea PRICE: usdt = fusdt * price → fusdt = usdt / price
const FUSDT_AMOUNT = USDT_AMOUNT / PRICE;

const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
];
const LAB_ABI = [
  ...ERC20_ABI,
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
  { type: "function", name: "realBalanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
];
const FACTORY_ABI = [
  { type: "function", name: "getPair", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "address" }] },
];
const ROUTER_ABI = [
  {
    type: "function",
    name: "addLiquidity",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "amountADesired", type: "uint256" },
      { name: "amountBDesired", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
  },
];

const account = privateKeyToAccount(PK);
const transport = http(RPC);
const publicClient = createPublicClient({ chain: bsc, transport });
const walletClient = createWalletClient({ account, chain: bsc, transport });

const fusdtUnits = parseUnits(FUSDT_AMOUNT.toString(), LAB_DECIMALS);
const usdtUnits = parseUnits(USDT_AMOUNT.toString(), USDT_DECIMALS);

async function waitTx(hash, label) {
  console.log(`  ${label} tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${label} revertida`);
  console.log(`  ${label} ✓ (bloque ${receipt.blockNumber})`);
}

async function main() {
  console.log("== Crear pool de precio fUSDT/USDT (PancakeSwap BSC) ==");
  console.log("Treasury:", account.address);
  console.log("Token lab:", CONTRACT);
  console.log(`Aportación: ${FUSDT_AMOUNT} fUSDT + ${USDT_AMOUNT} USDT → precio ≈ $${PRICE}/fUSDT`);

  const owner = await publicClient.readContract({ address: CONTRACT, abi: LAB_ABI, functionName: "owner" });
  if (owner.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error(`La treasury (${account.address}) no es owner del token lab (owner: ${owner}).`);
  }

  const [bnb, usdtBal] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({ address: USDT_BSC, abi: ERC20_ABI, functionName: "balanceOf", args: [account.address] }),
  ]);
  console.log(`BNB treasury: ${formatEther(bnb)} · USDT treasury: ${formatUnits(usdtBal, USDT_DECIMALS)}`);

  if (usdtBal < usdtUnits) {
    throw new Error(`USDT insuficiente. Necesitas ${USDT_AMOUNT} USDT reales en la treasury. Envíalos en BSC (BEP20) y reintenta.`);
  }
  if (bnb < parseUnits("0.003", 18)) {
    throw new Error("BNB insuficiente para gas (necesitas ~0.003 BNB).");
  }

  // 1) Mint fUSDT a la treasury para el lado del par.
  const realFusdt = await publicClient.readContract({ address: CONTRACT, abi: LAB_ABI, functionName: "realBalanceOf", args: [account.address] });
  if (realFusdt < fusdtUnits) {
    console.log("1) Acuñando fUSDT a la treasury…");
    const h = await walletClient.writeContract({ address: CONTRACT, abi: LAB_ABI, functionName: "mint", args: [account.address, fusdtUnits] });
    await waitTx(h, "mint");
  } else {
    console.log("1) Treasury ya tiene fUSDT suficiente, salto mint.");
  }

  // 2) Approves al router.
  console.log("2) Aprobando router (fUSDT)…");
  const ha = await walletClient.writeContract({ address: CONTRACT, abi: ERC20_ABI, functionName: "approve", args: [ROUTER, fusdtUnits] });
  await waitTx(ha, "approve fUSDT");

  console.log("   Aprobando router (USDT)…");
  const hb = await walletClient.writeContract({ address: USDT_BSC, abi: ERC20_ABI, functionName: "approve", args: [ROUTER, usdtUnits] });
  await waitTx(hb, "approve USDT");

  // 3) addLiquidity.
  console.log("3) Añadiendo liquidez…");
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
  const minA = (fusdtUnits * 95n) / 100n;
  const minB = (usdtUnits * 95n) / 100n;
  const hl = await walletClient.writeContract({
    address: ROUTER,
    abi: ROUTER_ABI,
    functionName: "addLiquidity",
    args: [CONTRACT, USDT_BSC, fusdtUnits, usdtUnits, minA, minB, account.address, deadline],
  });
  await waitTx(hl, "addLiquidity");

  // 4) Leer el par creado.
  const pair = await publicClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "getPair", args: [CONTRACT, USDT_BSC] });
  console.log("\n== Pool creado ==");
  console.log("Par:", pair);
  console.log("DexScreener:", `https://dexscreener.com/bsc/${CONTRACT}`);
  console.log("GeckoTerminal:", `https://www.geckoterminal.com/bsc/tokens/${CONTRACT}`);
  console.log("\nVerifica el precio en DexScreener (inmediato). MetaMask/SafePal pueden tardar minutos en indexar vía CoinGecko/DeBank.");
}

main().catch((e) => {
  console.error("\nERROR:", e.shortMessage || e.message);
  process.exit(1);
});
