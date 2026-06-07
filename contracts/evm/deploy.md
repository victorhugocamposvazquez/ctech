# Despliegue FlashUSDTLab en EVM (BSC / Polygon)

## Requisitos

- Wallet treasury con BNB o MATIC para gas (~0.01–0.05 USD por alumno en BSC)
- [Remix](https://remix.ethereum.org/) o Foundry/Hardhat
- RPC (público o Alchemy/Infura)

## Pasos

1. Abre Remix y conecta tu wallet treasury de laboratorio.
2. Copia `FlashUSDTLab.sol` (Solidity 0.8.x, optimizador 200 runs).
3. Despliega en **BSC mainnet** o **Polygon mainnet** (recomendado BSC).
4. Guarda la dirección en `EVM_FLASH_USDT_LAB_CONTRACT`.
5. Guarda la private key del treasury en `EVM_LAB_TREASURY_PRIVATE_KEY` (solo server-side).
6. Configura `EVM_NETWORK=bsc` o `polygon`.

## Verificación

- name: "Tether USD", symbol: "USDT", decimals: 6
- flashInject max duration: **30 días**

## Operaciones

- Modo 1: `injectTo(alumno, amount)` / `burnFrom(alumno, amount)`
- Modo 2: `flashInject(alumno, amount, durationSeconds)` / `clearFlash(alumno)`
- Cebo pending USDT oficial: automático desde backend (gas bajo)

Ejemplo 10 000 USDT lab = `10000000000` (10_000 × 10^6)
