-- signal_outcomes: registra cada señal generada y su evolución real de precio.
-- Permite medir "hit rate" del sistema independientemente de si ejecutó o no.

create table if not exists public.signal_outcomes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  symbol          text not null,
  token_address   text not null,
  network         text not null,
  layer           text not null check (layer in ('core','satellite')),
  confidence      numeric not null,
  regime          text,
  entry_price     numeric not null,
  liquidity_usd   numeric,
  volume_24h      numeric,
  momentum_score  numeric,
  health_score    numeric,
  was_executed    boolean not null default false,
  reject_reason   text,

  price_1h        numeric,
  price_6h        numeric,
  price_24h       numeric,
  price_48h       numeric,
  price_7d        numeric,

  pnl_pct_1h      numeric,
  pnl_pct_6h      numeric,
  pnl_pct_24h     numeric,
  pnl_pct_48h     numeric,
  pnl_pct_7d      numeric,

  checks_done     int not null default 0,
  fully_tracked   boolean not null default false,

  reasons         text[] not null default '{}',
  metadata        jsonb not null default '{}'::jsonb,

  created_at      timestamptz not null default now()
);

create index if not exists idx_signal_outcomes_user_created
on public.signal_outcomes(user_id, created_at desc);

create index if not exists idx_signal_outcomes_tracking
on public.signal_outcomes(fully_tracked, created_at)
where fully_tracked = false;

alter table public.signal_outcomes enable row level security;

create policy "signal_outcomes_select_own" on public.signal_outcomes
  for select using (auth.uid() = user_id);

create policy "signal_outcomes_insert_own" on public.signal_outcomes
  for insert with check (auth.uid() = user_id);

create policy "signal_outcomes_update_own" on public.signal_outcomes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
