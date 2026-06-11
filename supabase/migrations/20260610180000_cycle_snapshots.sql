-- ============================================================
-- Archivo histórico de candidatos (anti sesgo de superviviente)
--
-- cycle_snapshots: una fila por ciclo con TODOS los candidatos que los
-- detectores vieron (aceptados y rechazados), con métricas crudas y motivo
-- de rechazo. Los feeds públicos (DexScreener/Gecko/Birdeye) olvidan a los
-- tokens que mueren — capturarlos en vivo es la única forma de construir:
--   - backtests honestos (replay de filtros alternativos sobre el pasado)
--   - distribuciones empíricas (cola de pérdidas, frecuencia de 10x/50x)
--   - datasets etiquetados para clasificadores de rug/explosión (Fase 1+)
--
-- Volumen estimado: ~96 ciclos/día × ≤400 candidatos ≈ 2-3 MB/día.
-- ============================================================

create table if not exists public.cycle_snapshots (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  timestamp               timestamptz not null default now(),
  regime                  text not null default 'unknown',
  momentum_pools_scanned  int not null default 0,
  early_pools_scanned     int not null default 0,
  candidates_count        int not null default 0,
  candidates              jsonb not null default '[]'::jsonb,
  created_at              timestamptz not null default now()
);

create index if not exists idx_cycle_snapshots_user_timestamp
on public.cycle_snapshots(user_id, timestamp desc);

alter table public.cycle_snapshots enable row level security;

create policy "cycle_snapshots_select_own" on public.cycle_snapshots
  for select using (auth.uid() = user_id);

create policy "cycle_snapshots_insert_own" on public.cycle_snapshots
  for insert with check (auth.uid() = user_id);
