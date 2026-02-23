-- ============================================================
-- Calibration state for incremental threshold auto-tuning
-- ============================================================

create table if not exists public.calibration_state (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  momentum_score_threshold  numeric not null default 55,
  early_score_threshold     numeric not null default 50,
  core_min_confidence       numeric not null default 75,
  satellite_min_confidence  numeric not null default 50,
  hit_rate_24h_core         numeric not null default 0,
  hit_rate_24h_satellite    numeric not null default 0,
  avg_pnl_24h               numeric not null default 0,
  profit_factor_rolling     numeric not null default 0,
  expectancy_rolling        numeric not null default 0,
  calibrated_at             timestamptz not null default now(),
  created_at                timestamptz not null default now(),
  constraint uq_calibration_state_user unique (user_id)
);

create index if not exists idx_calibration_state_user
on public.calibration_state(user_id);

alter table public.calibration_state enable row level security;

create policy "calibration_state_select_own" on public.calibration_state
  for select using (auth.uid() = user_id);

create policy "calibration_state_insert_own" on public.calibration_state
  for insert with check (auth.uid() = user_id);

create policy "calibration_state_update_own" on public.calibration_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
