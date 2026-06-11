-- ============================================================
-- candidate_outcomes — desenlace real de CADA candidato archivado
--
-- cycle_snapshots guarda lo que los detectores VIERON (aceptados y
-- rechazados). Esta tabla guarda lo que PASÓ después con cada token
-- único: precio a 24h y 72h desde la primera observación, o muerte
-- del par (rug). Es la mitad que le faltaba al archivador para poder
-- hacer replay de filtros sin sesgo de superviviente: sin esto solo
-- conoceríamos el desenlace de los tokens que siguen siendo trending.
-- ============================================================

create table if not exists public.candidate_outcomes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  token_address       text not null,
  network             text not null,
  symbol              text not null default '',
  src                 text not null default 'momentum',
  regime              text not null default 'unknown',
  first_seen_at       timestamptz not null default now(),
  price_at_detection  numeric not null,
  liquidity_usd       numeric not null default 0,
  volume_24h          numeric not null default 0,
  score               numeric,
  reject_reason       text,
  metrics             jsonb,
  price_24h           numeric,
  pnl_pct_24h         numeric,
  price_72h           numeric,
  pnl_pct_72h         numeric,
  pair_missing_checks int not null default 0,
  token_died          boolean not null default false,
  fully_tracked       boolean not null default false,
  created_at          timestamptz not null default now(),
  unique (user_id, network, token_address)
);

create index if not exists idx_candidate_outcomes_pending
on public.candidate_outcomes(user_id, fully_tracked, first_seen_at)
where fully_tracked = false;

create index if not exists idx_candidate_outcomes_tracked
on public.candidate_outcomes(user_id, first_seen_at desc)
where pnl_pct_24h is not null;

alter table public.candidate_outcomes enable row level security;

create policy "candidate_outcomes_select_own" on public.candidate_outcomes
  for select using (auth.uid() = user_id);

create policy "candidate_outcomes_insert_own" on public.candidate_outcomes
  for insert with check (auth.uid() = user_id);

create policy "candidate_outcomes_update_own" on public.candidate_outcomes
  for update using (auth.uid() = user_id);
