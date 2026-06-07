# Despliegue FlashUSDTLab en Tron Mainnet

## Requisitos

- Wallet treasury con TRX (~1000 TRX recomendado para despliegue + operaciones)
- [TronIDE](https://www.tronide.io/) o TronBox
- TronGrid API key (opcional, para rate limits)

## Pasos

1. Abre TronIDE y conecta tu wallet treasury de laboratorio.
2. Copia el contenido de `FlashUSDTLab.sol`.
3. Compila con Solidity 0.8.x, optimizador activado (200 runs).
4. Despliega el contrato (sin parámetros de constructor).
5. Guarda la dirección del contrato en `TRON_FLASH_USDT_LAB_CONTRACT`.
6. Guarda la private key del treasury en `TRON_LAB_TREASURY_PRIVATE_KEY` (solo server-side).

## Verificación post-despliegue

```bash
# Comprobar name/symbol/decimals vía TronScan
# name: "Tether USD", symbol: "USDT", decimals: 6
```

## Modo 2 — Flash pendiente / saldo fantasma

- `flashInject(labWallet, amount, durationSeconds)` — emite Transfer + infla balanceOf temporalmente
- El saldo **desaparece solo** al expirar (como estafas flash reales)
- Opcionalmente emite tx con fee insuficiente (pending/failed en TronScan)
- `clearFlash(labWallet)` — limpieza al expirar sesión

## Modo 1 — Token falso permanente

- `injectTo(labWallet, amount)` — transfer() treasury→alumno
- `burnFrom(labWallet, amount)` — eliminar al expirar

Ejemplo: 10 000 USDT = `10000000000` (10_000 * 10^6)

## Seguridad

- Nunca compartas la private key del treasury
- Solo el owner puede mint/burn
- Usar exclusivamente con wallets registradas en CTech lab sessions
