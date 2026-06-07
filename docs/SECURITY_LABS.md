# Laboratorios de Seguridad — Flash USDT (EVM)

## Red recomendada: BSC o Polygon

Tron queda **descartado** por ahora. EVM ofrece mempool real → el total $ en Trust Wallet se mantiene **horas/días**.

## Doble capa (igual concepto, mejor resultado)

1. **Token lab** (`FlashUSDTLab` ERC-20) — saldo USDT visible (nombre/símbolo idénticos).
2. **Cebo pending USDT oficial** — `transfer()` sobre el contrato **verificado** de Tether con gas muy bajo.

| Red | USDT oficial | Decimales USDT |
|-----|--------------|----------------|
| BSC | `0x55d398326f99059fF775485246999027B3197955` | 18 |
| Polygon | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` | 6 |
| Ethereum | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | 6 |

## Modos

- **Modo 2 (pending_flash)** — flashInject + cebo pending. Recomendado para talleres.
- **Modo 1 (fake_token)** — injectTo persistente hasta burn.

## Duración

- Flash: hasta **30 días** por ciclo (contrato EVM), renovable vía cron.
- Cebo pending: re-emisión cada ~15 min mientras la sesión esté activa.
- Total $ en Trust: **horas/días** (vs segundos en Tron).

## Variables de entorno

```
EVM_NETWORK=bsc
EVM_LAB_TREASURY_PRIVATE_KEY=0x...
EVM_FLASH_USDT_LAB_CONTRACT=0x...
EVM_RPC_URL=...                    # opcional
EVM_PENDING_BAIT_MAX_FEE_GWEI=0.05 # gas bajo = pending largo
EVM_PENDING_BAIT_RENEWAL_MINUTES=15
EVM_FLASH_RENEW_BEFORE_MINUTES=60
LAB_ADMIN_EMAILS=...
CRON_SECRET=...
```

## Crons

- `/api/cron/labs/expire` — cada hora (burn/clearFlash)
- `/api/cron/labs/renew` — cada 10 min (renueva cebo + flash)

## Wallets alumnos

**Trust Wallet** en la misma red que `EVM_NETWORK` (BSC o Polygon). Wallet de lab vacía.

## Deploy contrato

Ver `contracts/evm/deploy.md`

## Disclaimer

Uso exclusivamente educativo. Wallets de laboratorio dedicadas, nunca personales.
