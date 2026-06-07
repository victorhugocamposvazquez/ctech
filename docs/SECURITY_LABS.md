# Laboratorios de Seguridad — Uso Responsable

## Flash USDT (Tron)

### Modo 2 — Flash pendiente (recomendado para talleres)

Saldo USDT fantasma que aparece y desaparece. Más impactante y fiel a estafas "flash".

### Modo 1 — Token falso

Token TRC-20 clonado transferido al alumno hasta burn manual/cron.

### Cómo funciona la inyección

1. El contrato `FlashUSDTLab` replica metadatos USDT (nombre, símbolo, 6 decimales).
2. La inyección usa `injectTo()`: transferencia TRC-20 treasury → wallet del alumno.
3. Trust Wallet, Atomic y similares **detectan automáticamente** la transferencia entrante.
4. **No hace falta importar el contrato manualmente** — el saldo se suma al total USDT visible.
5. Si el alumno ya tiene USDT real, el total mostrado incluye ambos (real + flash).

### Requisitos operativos

- Wallet treasury con TRX para gas (~10-15 TRX por alumno)
- Contrato desplegado en Tron mainnet (ver `contracts/tron/deploy.md`)
- Variables de entorno configuradas en Vercel (nunca exponer private key al cliente)
- Emails de instructores en `LAB_ADMIN_EMAILS`

### Salvaguardas

- Solo direcciones registradas en sesión activa con consentimiento
- Rate limit: 1 inyección por sesión cada 60 segundos
- Auto-burn vía cron `/api/cron/labs/expire` (cada hora)
- Audit log en tabla `lab_audit_log`

### Disclaimer

Uso exclusivamente educativo. Prohibido usar fuera de sesiones controladas.
Los alumnos deben usar wallets de laboratorio dedicadas, nunca wallets personales con fondos reales.
