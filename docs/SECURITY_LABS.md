# Laboratorios de Seguridad — Flash USDT (EVM)

## Redes soportadas

| Red | `EVM_NETWORK` | USDT oficial | Gas típico | Recomendación |
|-----|---------------|--------------|------------|---------------|
| **BSC** | `bsc` | `0x55d398326f99059fF775485246999027B3197955` | Muy bajo | **Talleres** (default) |
| **Ethereum** | `ethereum` | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | Alto | Demos cortas, pending muy largo |

**Multi-red:** un solo despliegue Vercel puede servir BSC + Ethereum (y Polygon). Cada sesión elige su red al crearse. Variables por red: `EVM_BSC_FLASH_USDT_LAB_CONTRACT`, `EVM_ETHEREUM_FLASH_USDT_LAB_CONTRACT`, etc. Treasury compartida (`EVM_LAB_TREASURY_PRIVATE_KEY`) con BNB y ETH para gas en cada chain.

## Doble capa

1. **Token lab** (`FlashUSDTLab` ERC-20) — saldo USDT visible (nombre/símbolo idénticos).
2. **Cebo pending USDT oficial** — `transfer()` sobre el contrato **verificado** de Tether con gas muy bajo.

## Modos

- **Modo 2 (pending_flash)** — flashInject + cebo pending. Recomendado para talleres.
- **Modo 1 (fake_token)** — injectTo persistente hasta burn.

## Duración

- Flash: hasta **30 días** por ciclo (contrato EVM), renovable vía cron.
- Cebo pending: re-emisión cada ~15 min mientras la sesión esté activa.
- Total $ en Trust/MetaMask: **horas/días**.

## Crons

- `/api/cron/labs/expire` — cada hora (burn/clearFlash)
- `/api/cron/labs/renew` — cada 10 min (renueva cebo + flash)

## Wallets para alumnos (BSC / Ethereum)

Wallet de **laboratorio vacía**. Misma red que `EVM_NETWORK`.

### Tier A — Mejor experiencia (total $ + saldo visible)

| Wallet | BSC | Ethereum | Notas |
|--------|-----|----------|-------|
| **Trust Wallet** | ✅ | ✅ | Recomendada. Pending USDT oficial suma al total $ horas/días. |
| **MetaMask** | ✅ | ✅ | Muy usada en talleres. Mismo comportamiento pending. |
| **Rabby** | ✅ | ✅ | Buena lectura de txs pending y contratos. |

### Tier B — Funcionan bien

| Wallet | BSC | Ethereum | Notas |
|--------|-----|----------|-------|
| **TokenPocket** | ✅ | ✅ | Popular en Asia, soporte BSC nativo. |
| **OKX Wallet** | ✅ | ✅ | Web3 integrado, precios conservadores en tokens no listados. |
| **SafePal** | ✅ | ✅ | Similar a Trust. |
| **Coinbase Wallet** | ✅ | ✅ | Filtra tokens no verificados (saldo sí, total $ a veces no). |

### Tier C — No recomendadas para el lab

| Wallet | Motivo |
|--------|--------|
| **Ledger + app externa** | Lento para ver el “momento wow” del pending. |
| **Wallets de exchange** (Binance app, etc.) | No son self-custody EVM estándar para el ejercicio. |

### Config Trust Wallet (alumno)

1. Instalar Trust Wallet, crear wallet **nueva solo para el lab**.
2. **BSC:** Ajustes → Redes → activar **Smart Chain (BSC)**.
3. **Ethereum:** activar red **Ethereum**.
4. Copiar dirección **0x…** (no Tron) al panel del lab.
5. Tras la inyección, abrir la wallet en los **primeros 30 s** y mirar **línea USDT + total $ arriba**.

## Variables de entorno

Ver `.env.local.example` — bloques **BSC**, **Ethereum** y treasury compartida. Endpoint `/api/labs/evm-config` lista redes configuradas.

## Deploy contrato

Ver `contracts/evm/deploy.md`

## Disclaimer

Uso exclusivamente educativo. Wallets de laboratorio dedicadas, nunca personales.
