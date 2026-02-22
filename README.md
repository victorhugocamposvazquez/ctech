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

## API mínima (MVP)

- `GET /api/dashboard/kpis` → devuelve `signalsToday`, `tradesToday`, `pnlTotal`.
- `POST /api/signals` → crea una señal para el usuario autenticado.
- `POST /api/trades/manual` → crea una operación manual (`status: open`).

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

## Stack

- **Next.js 15** (App Router), **TypeScript**, **Tailwind CSS**
- **Supabase** (Auth + DB)
- Deploy en **Vercel**

## Próximos pasos (producto)

- Modelo de datos en Supabase (señales, trades, exchanges).
- Integración con APIs (Glassnode, Arkham, Dune) y ejecución en exchange.
