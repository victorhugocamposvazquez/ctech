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

## Stack

- **Next.js 15** (App Router), **TypeScript**, **Tailwind CSS**
- **Supabase** (Auth + DB)
- Deploy en **Vercel**

## Próximos pasos (producto)

- Modelo de datos en Supabase (señales, trades, exchanges).
- Integración con APIs (Glassnode, Arkham, Dune) y ejecución en exchange.
