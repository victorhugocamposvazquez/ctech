-- ============================================================
-- Cycle runs history (persist orchestrator summaries)
-- ============================================================

create table if not exists public.cycle_runs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  timestamp           timestamptz not null default now(),
  regime              text not null default 'unknown',
  pools_scanned       int not null default 0,
  tokens_scanned      int not null default 0,
  early_pools_scanned int not null default 0,
  early_candidates    int not null default 0,
  signals_generated   int not null default 0,
  trades_opened       int not null default 0,
  trades_closed       int not null default 0,
  errors_count        int not null default 0,
  errors              jsonb not null default '[]'::jsonb,
  stress_events_count int not null default 0,
  calibration         jsonb,
  rolling_metrics     jsonb,
  forward_prediction_7d  jsonb,
  forward_prediction_30d jsonb,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists idx_cycle_runs_user_timestamp
on public.cycle_runs(user_id, timestamp desc);

alter table public.cycle_runs enable row level security;

create policy "cycle_runs_select_own" on public.cycle_runs
  for select using (auth.uid() = user_id);

create policy "cycle_runs_insert_own" on public.cycle_runs
  for insert with check (auth.uid() = user_id);
