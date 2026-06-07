# Despliegue FlashUSDTLab — Multi-red (BSC + Ethereum)

> **Recomendado:** usa el backoffice (**Dashboard → Laboratorios → Infra EVM**) para desplegar y verificar sin Remix. Esta guía es alternativa manual.

Contrato educativo ERC-20 que imita USDT. Despliégalo **una vez por red**; el backend enruta cada sesión a la chain correcta.

## Resumen

| Red | Chain ID | Gas por alumno (aprox.) | Explorador |
|-----|----------|-------------------------|------------|
| **BSC** | 56 | ~0.01–0.05 USD | [BscScan](https://bscscan.com) |
| **Ethereum** | 1 | ~1–5+ USD | [Etherscan](https://etherscan.io) |
| Polygon (opcional) | 137 | ~0.01 USD | [Polygonscan](https://polygonscan.com) |

**Recomendación:** BSC para talleres con muchos alumnos; Ethereum para demos cortas (pending más largo, gas caro).

---

## Requisitos

- Wallet **treasury de laboratorio** (nunca personal) — la misma dirección sirve en BSC y Ethereum
- Fondos en cada red:
  - **BNB** en BSC (mín. ~0.05 BNB para un taller de 20 alumnos)
  - **ETH** en Ethereum (mín. ~0.02 ETH para demos pequeñas)
- [Remix](https://remix.ethereum.org/) (más simple) o Foundry/Hardhat
- RPC por red (público o Alchemy/Infura)

---

## Paso 1 — Desplegar en BSC

1. Abre [Remix](https://remix.ethereum.org/) → pestaña **Solidity Compiler**.
2. Compiler: **0.8.x**, optimizador **200 runs**.
3. Copia `FlashUSDTLab.sol` al workspace.
4. Pestaña **Deploy & Run**:
   - Environment: **Injected Provider - MetaMask** (o Rabby)
   - Network: **BNB Smart Chain (BSC mainnet, chainId 56)**
   - Conecta la wallet treasury del lab
5. Deploy (sin constructor args).
6. Copia la dirección del contrato → `EVM_BSC_FLASH_USDT_LAB_CONTRACT`.

Verifica en BscScan: name `Tether USD`, symbol `USDT`, decimals `6`.

---

## Paso 2 — Desplegar en Ethereum

1. En la **misma wallet treasury**, cambia MetaMask a **Ethereum Mainnet (chainId 1)**.
2. Asegúrate de tener ETH para gas (~0.003–0.01 ETH por deploy + operaciones).
3. Repite el deploy de `FlashUSDTLab.sol` en Remix.
4. Copia la dirección → `EVM_ETHEREUM_FLASH_USDT_LAB_CONTRACT`.

> Contratos **distintos** en cada red. No reutilices la dirección de BSC.

Verifica en Etherscan con los mismos parámetros (name/symbol/decimals).

---

## Paso 3 — Variables de entorno

Copia `.env.local.example` → `.env.local`. Mínimo para backoffice:

```env
EVM_LAB_TREASURY_PRIVATE_KEY=0x...
EVM_EXPLORER_API_KEY=...   # opcional, para verificar en explorer
```

Tras desplegar desde el panel, **no hace falta** copiar direcciones a env (se guardan en BD). Opcionalmente puedes fijarlas en env (tienen prioridad):

```env
# Treasury compartida (misma private key en server)
EVM_LAB_TREASURY_PRIVATE_KEY=0x...

# Red por defecto al crear sesión
EVM_NETWORK=bsc

# BSC
EVM_BSC_FLASH_USDT_LAB_CONTRACT=0x...
EVM_BSC_RPC_URL=https://bsc-dataseed.binance.org

# Ethereum
EVM_ETHEREUM_FLASH_USDT_LAB_CONTRACT=0x...
EVM_ETHEREUM_RPC_URL=https://eth.llamarpc.com

# Cebo pending USDT oficial (gas bajo = pending largo)
EVM_PENDING_BAIT_MAX_FEE_GWEI=0.05
EVM_PENDING_BAIT_RENEWAL_MINUTES=15
EVM_FLASH_RENEW_BEFORE_MINUTES=60
```

### Legacy (solo una red)

Si despliegas **solo BSC**, puedes usar las vars antiguas:

```env
EVM_NETWORK=bsc
EVM_FLASH_USDT_LAB_CONTRACT=0x...
EVM_RPC_URL=https://bsc-dataseed.binance.org
```

### Polygon (opcional)

```env
EVM_POLYGON_FLASH_USDT_LAB_CONTRACT=0x...
EVM_POLYGON_RPC_URL=https://polygon-rpc.com
```

---

## Paso 4 — Comprobar configuración

Tras arrancar la app, abre (autenticado o no según tu setup):

```
GET /api/labs/evm-config
```

Respuesta esperada con ambas redes:

```json
{
  "enabledNetworks": ["bsc", "ethereum"],
  "multiNetwork": true,
  "networks": [
    { "id": "bsc", "configured": true, "label": "BNB Smart Chain (BSC)" },
    { "id": "ethereum", "configured": true, "label": "Ethereum" }
  ]
}
```

En el panel instructor, el selector **Red blockchain** debe mostrar BSC y Ethereum activas.

---

## Contrato — referencia rápida

| Función | Uso |
|---------|-----|
| `injectTo(alumno, amount)` | Modo 1 — token falso persistente |
| `burnFrom(alumno, amount)` | Expira Modo 1 |
| `flashInject(alumno, amount, durationSeconds)` | Modo 2 — saldo fantasma |
| `clearFlash(alumno)` | Expira Modo 2 |

- **Decimals lab:** 6 (10 000 USDT = `10000000000`)
- **Flash máximo:** 30 días por ciclo (`durationSeconds`)
- **Cebo pending USDT oficial:** lo emite el backend automáticamente (transfer con gas bajo)

### USDT oficial Tether (solo referencia — no desplegar)

| Red | Contrato USDT |
|-----|---------------|
| BSC | `0x55d398326f99059fF775485246999027B3197955` |
| Ethereum | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| Polygon | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |

---

## Foundry (alternativa a Remix)

```bash
# Instalar foundry si no lo tienes: curl -L https://foundry.paradigm.xyz | bash

# BSC
forge create contracts/evm/FlashUSDTLab.sol:FlashUSDTLab \
  --rpc-url https://bsc-dataseed.binance.org \
  --private-key $EVM_LAB_TREASURY_PRIVATE_KEY \
  --broadcast

# Ethereum
forge create contracts/evm/FlashUSDTLab.sol:FlashUSDTLab \
  --rpc-url https://eth.llamarpc.com \
  --private-key $EVM_LAB_TREASURY_PRIVATE_KEY \
  --broadcast
```

Guarda cada `Deployed to:` en la variable de entorno correspondiente.

---

## Checklist pre-taller

- [ ] Contrato desplegado y verificado en la red de la sesión
- [ ] Treasury con gas suficiente **en esa red**
- [ ] Vars `EVM_{RED}_FLASH_USDT_LAB_CONTRACT` en Vercel/local
- [ ] Crons activos vía GitHub Actions (`labs-cron-renew.yml`, `labs-cron-expire.yml`)
- [ ] Alumnos instruidos: wallet nueva + **misma red** que la sesión (Trust/MetaMask)

---

## Seguridad

- Private key **solo** en server (`EVM_LAB_TREASURY_PRIVATE_KEY` en Vercel, nunca en cliente)
- Wallet treasury dedicada al lab, sin fondos personales
- Uso exclusivamente educativo — ver `docs/SECURITY_LABS.md`
