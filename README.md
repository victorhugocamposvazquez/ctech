# CTech – Copy Trading Crypto

SaaS de copy trading con señales, ejecución automática y autoaprendizaje. Next.js + Supabase + Tailwind.

## Arranque rápido

1. **Dependencias**
   ```bash
   npm install
   ```

2. **Supabase**
   - Crea un proyecto en [supabase.com](https://supabase.com).
   - En Authentication → Providers deja habilitado Email (y opcionalmente “Confirm email” si quieres verificación).
   - En Settings → API copia **Project URL** y **anon public** key.

3. **Variables de entorno**
   ```bash
   cp .env.local.example .env.local
   ```
   Edita `.env.local` y rellena:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Desarrollo**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000). Entra en **Registrarse**, crea una cuenta y serás redirigido al dashboard.

## Rutas

- `/` – Landing (Iniciar sesión / Registrarse).
- `/login` – Login (email + contraseña o enlace mágico).
- `/signup` – Registro.
- `/dashboard` – Área privada (sidebar: Dashboard, Señales, Trades, Exchanges, Configuración).

Las rutas bajo `/dashboard` requieren sesión; si no estás logueado te redirige a `/login`.

## API

### Dashboard
- `GET /api/dashboard/kpis` → devuelve `signalsToday`, `tradesToday`, `pnlTotal`.

### Señales y trades
- `POST /api/signals` → crea una señal para el usuario autenticado.
- `POST /api/trades/manual` → crea una operación manual (`status: open`).

### Arkham Pipeline (Wallet Intelligence)
- `GET /api/wallets` → lista wallets tracked del usuario (con último score).
- `POST /api/wallets` → añade/actualiza una wallet al tracking.
- `POST /api/scan` → ejecuta ciclo completo: escaneo de swaps → scoring de wallets → generación de señales.

### Ejemplos rápidos

```bash
curl -X POST http://localhost:3000/api/signals \
  -H "Content-Type: application/json" \
  -d '{
    "strategyName": "mvp_rule_1",
    "symbol": "BTCUSDT",
    "timeframe": "1m",
    "direction": "buy",
    "score": 0.82,
    "source": "manual"
  }'
```

```bash
curl -X POST http://localhost:3000/api/trades/manual \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "side": "buy",
    "quantity": 0.001,
    "entryPrice": 95000
  }'
```

> Nota: estas rutas requieren sesión válida (cookies de Supabase en el navegador).

## SQL de Supabase

Ejecuta `supabase/schema.sql` en el SQL Editor de Supabase para crear tablas y políticas RLS del MVP.

## Migraciones de Supabase (historial en proyecto)

- Carpeta de migraciones: `supabase/migrations/`
- Índice legible: `supabase/migrations/README.md`
- Comando para listarlas:

```bash
npm run db:migrations:list
```

La primera migración quedó registrada como:
- `supabase/migrations/20260222223000_init_schema.sql`

Cuando hagamos cambios de esquema, añadimos nuevas migraciones con timestamp y se actualiza el índice.

## Deploy en Vercel

Si ves este error:

`No Output Directory named "public" found after the build complete`

la causa suele ser configuración incorrecta del proyecto en Vercel (Output Directory forzado a `public`).

Este repo ya incluye `vercel.json` con `framework: nextjs`. Además, en Vercel revisa:

- **Framework Preset**: `Next.js`
- **Build Command**: `next build` (o por defecto)
- **Output Directory**: vacío / por defecto (no `public`)

## Scheduling de ciclos (Vercel Free + GitHub Actions)

Para mantener compatibilidad con Vercel Hobby:

- `vercel.json` deja solo el cron diario `0 0 * * *` para `/api/cron/risk-reset`.
- El ciclo de trading cada 15 min se ejecuta desde GitHub Actions: `.github/workflows/cycle-cron.yml`.

### Secrets necesarios en GitHub

En tu repo de GitHub, configura:

- `CTECH_BASE_URL` → URL pública de tu app (ej. `https://ctech.vercel.app`)
- `CRON_SECRET` → mismo valor que usas en producción para proteger `/api/cron/*`

El workflow llama:

- `GET /api/cron/cycle?secret=...` cada 15 minutos
- también se puede lanzar manualmente con `workflow_dispatch`

### Monitorización de fallos del scheduler

- Workflow: `.github/workflows/cycle-watchdog.yml`
- Se activa cuando termina `CTech Cycle Scheduler`.
- Si el ciclo falla, crea (o actualiza) una issue de incidencia con etiqueta `scheduler-incident`.

## Stack

- **Next.js 15** (App Router), **TypeScript**, **Tailwind CSS**
- **Supabase** (Auth + DB)
- Deploy en **Vercel**

## Engine (src/lib/engine)

- **RiskGate** — evaluación pre-trade con kill switches (pérdida diaria, semanal, pérdidas consecutivas).
- **PaperBroker** — ejecución simulada con slippage, gas y latencia realistas conectada a precios de mercado.
- Arquitectura dual Core (estabilidad) + Satellite (alta asimetría).

## Arkham Pipeline (src/lib/arkham)

- **ArkhamClient** — cliente HTTP con rate limiting para Arkham Intelligence API.
- **WalletTracker** — escaneo de swaps de wallets monitorizadas.
- **WalletScorer** — scoring de wallets (win rate, profit factor, drawdown, consistencia).
- **SignalGenerator** — generación de señales operativas filtradas por wallet_score + token_health.

## Señales (src/lib/signals)

- **MomentumDetector** — escanea DexScreener buscando tokens con momentum anómalo (volumen, buy pressure, aceleración).
- **ConfluenceEngine** — combina 4 capas (momentum + wallet confluence + token health + régimen) y decide si operar.
- **PositionManager** — gestiona trades abiertos: trailing stops, tiempo máximo, salida por volumen/liquidez, take profit.
- **Orchestrator** — pipeline completo end-to-end en un ciclo. API: `POST /api/cycle`.

## Market Data (src/lib/market)

- **DexScreenerClient** — precios, liquidez y volumen en tiempo real ($0).
- **TokenHealthChecker** — scoring de salud de tokens con risk flags.
- **DexScreenerQuoteFetcher** — conecta precios reales al PaperBroker.
- **RegimeDetector** — clasifica mercado en risk_on/risk_off/neutral ($0).

## Próximos pasos

- Loop de mejora continua (reentrenamiento semanal de scores y umbrales).
- UI para visualizar señales, posiciones y rendimiento.
