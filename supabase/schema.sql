-- ============================================================
-- CTech – Schema consolidado
-- Ejecutar en SQL Editor de Supabase para crear todo desde cero.
-- ============================================================

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ==================== profiles ====================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- ==================== exchange_connections ====================

create table if not exists public.exchange_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exchange text not null,
  label text,
  api_key_encrypted text not null,
  api_secret_encrypted text not null,
  passphrase_encrypted text,
  is_testnet boolean not null default true,
  is_active boolean not null default true,
  last_check_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exchange_connections_user_id
on public.exchange_connections(user_id);

drop trigger if exists trg_exchange_connections_updated_at on public.exchange_connections;
create trigger trg_exchange_connections_updated_at
before update on public.exchange_connections
for each row execute function public.set_updated_at();

alter table public.exchange_connections enable row level security;

drop policy if exists "exchange_connections_select_own" on public.exchange_connections;
create policy "exchange_connections_select_own"
on public.exchange_connections for select
using (auth.uid() = user_id);

drop policy if exists "exchange_connections_insert_own" on public.exchange_connections;
create policy "exchange_connections_insert_own"
on public.exchange_connections for insert
with check (auth.uid() = user_id);

drop policy if exists "exchange_connections_update_own" on public.exchange_connections;
create policy "exchange_connections_update_own"
on public.exchange_connections for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "exchange_connections_delete_own" on public.exchange_connections;
create policy "exchange_connections_delete_own"
on public.exchange_connections for delete
using (auth.uid() = user_id);

-- ==================== signals ====================

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strategy_name text not null,
  symbol text not null,
  timeframe text not null default '1m',
  direction text not null check (direction in ('buy', 'sell', 'hold')),
  score numeric(6,3),
  source text,
  metadata jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_signals_user_generated_at
on public.signals(user_id, generated_at desc);

create index if not exists idx_signals_symbol
on public.signals(symbol);

alter table public.signals enable row level security;

drop policy if exists "signals_select_own" on public.signals;
create policy "signals_select_own"
on public.signals for select
using (auth.uid() = user_id);

drop policy if exists "signals_insert_own" on public.signals;
create policy "signals_insert_own"
on public.signals for insert
with check (auth.uid() = user_id);

drop policy if exists "signals_update_own" on public.signals;
create policy "signals_update_own"
on public.signals for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "signals_delete_own" on public.signals;
create policy "signals_delete_own"
on public.signals for delete
using (auth.uid() = user_id);

-- ==================== tracked_wallets ====================

create table if not exists public.tracked_wallets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  address     text not null,
  network     text not null default 'ethereum',
  label       text,
  category    text not null default 'unknown'
    check (category in ('alpha','momentum','early','lp_arb','swing','unknown')),
  source      text not null default 'manual'
    check (source in ('arkham','manual')),
  is_active   boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists idx_tracked_wallets_user_address_network
on public.tracked_wallets(user_id, address, network);

drop trigger if exists trg_tracked_wallets_updated_at on public.tracked_wallets;
create trigger trg_tracked_wallets_updated_at
before update on public.tracked_wallets
for each row execute function public.set_updated_at();

alter table public.tracked_wallets enable row level security;

drop policy if exists "tracked_wallets_select_own" on public.tracked_wallets;
create policy "tracked_wallets_select_own"
on public.tracked_wallets for select using (auth.uid() = user_id);

drop policy if exists "tracked_wallets_insert_own" on public.tracked_wallets;
create policy "tracked_wallets_insert_own"
on public.tracked_wallets for insert with check (auth.uid() = user_id);

drop policy if exists "tracked_wallets_update_own" on public.tracked_wallets;
create policy "tracked_wallets_update_own"
on public.tracked_wallets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tracked_wallets_delete_own" on public.tracked_wallets;
create policy "tracked_wallets_delete_own"
on public.tracked_wallets for delete using (auth.uid() = user_id);

-- ==================== wallet_scores ====================

create table if not exists public.wallet_scores (
  id                uuid primary key default gen_random_uuid(),
  wallet_id         uuid not null references public.tracked_wallets(id) on delete cascade,
  period_start      timestamptz not null,
  period_end        timestamptz not null,
  total_trades      int not null default 0,
  win_rate          numeric(6,4),
  profit_factor     numeric(10,4),
  avg_pnl_pct       numeric(10,4),
  max_drawdown_pct  numeric(10,4),
  consistency_score numeric(6,2) check (consistency_score >= 0 and consistency_score <= 100),
  overall_score     numeric(6,2) check (overall_score >= 0 and overall_score <= 100),
  calculated_at     timestamptz not null default now()
);

create index if not exists idx_wallet_scores_wallet_calculated
on public.wallet_scores(wallet_id, calculated_at desc);

alter table public.wallet_scores enable row level security;

drop policy if exists "wallet_scores_select_via_wallet" on public.wallet_scores;
create policy "wallet_scores_select_via_wallet" on public.wallet_scores for select
using (
  exists (
    select 1 from public.tracked_wallets tw
    where tw.id = wallet_id and tw.user_id = auth.uid()
  )
);

-- ==================== wallet_movements ====================

create table if not exists public.wallet_movements (
  id            uuid primary key default gen_random_uuid(),
  wallet_id     uuid not null references public.tracked_wallets(id) on delete cascade,
  token_address text not null,
  token_symbol  text not null,
  network       text not null default 'ethereum',
  direction     text not null check (direction in ('buy','sell')),
  amount_token  numeric(38,18),
  amount_usd    numeric(24,10),
  tx_hash       text,
  block_number  bigint,
  detected_at   timestamptz not null default now(),
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_wallet_movements_wallet_detected
on public.wallet_movements(wallet_id, detected_at desc);

create index if not exists idx_wallet_movements_token
on public.wallet_movements(token_address, detected_at desc);

alter table public.wallet_movements enable row level security;

drop policy if exists "wallet_movements_select_via_wallet" on public.wallet_movements;
create policy "wallet_movements_select_via_wallet" on public.wallet_movements for select
using (
  exists (
    select 1 from public.tracked_wallets tw
    where tw.id = wallet_id and tw.user_id = auth.uid()
  )
);

-- ==================== token_registry ====================

create table if not exists public.token_registry (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  address     text not null,
  network     text not null default 'ethereum',
  symbol      text not null,
  name        text,
  decimals    int not null default 18,
  category    text not null default 'defi'
    check (category in ('defi','meme','infra','stablecoin','wrapped','other')),
  is_active   boolean not null default true,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists idx_token_registry_user_address_network
on public.token_registry(user_id, address, network);

drop trigger if exists trg_token_registry_updated_at on public.token_registry;
create trigger trg_token_registry_updated_at
before update on public.token_registry
for each row execute function public.set_updated_at();

alter table public.token_registry enable row level security;

drop policy if exists "token_registry_select_own" on public.token_registry;
create policy "token_registry_select_own"
on public.token_registry for select using (auth.uid() = user_id);

drop policy if exists "token_registry_insert_own" on public.token_registry;
create policy "token_registry_insert_own"
on public.token_registry for insert with check (auth.uid() = user_id);

drop policy if exists "token_registry_update_own" on public.token_registry;
create policy "token_registry_update_own"
on public.token_registry for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "token_registry_delete_own" on public.token_registry;
create policy "token_registry_delete_own"
on public.token_registry for delete using (auth.uid() = user_id);

-- ==================== token_health_snapshots ====================

create table if not exists public.token_health_snapshots (
  id                      uuid primary key default gen_random_uuid(),
  token_id                uuid not null references public.token_registry(id) on delete cascade,
  liquidity_usd           numeric(24,2),
  volume_24h_usd          numeric(24,2),
  spread_pct              numeric(10,6),
  holders_count           int,
  top10_concentration_pct numeric(8,4),
  contract_risk_flags     text[] not null default '{}',
  health_score            numeric(6,2) check (health_score >= 0 and health_score <= 100),
  snapshot_at             timestamptz not null default now()
);

create index if not exists idx_token_health_token_snapshot
on public.token_health_snapshots(token_id, snapshot_at desc);

alter table public.token_health_snapshots enable row level security;

drop policy if exists "token_health_select_via_token" on public.token_health_snapshots;
create policy "token_health_select_via_token" on public.token_health_snapshots for select
using (
  exists (
    select 1 from public.token_registry tr
    where tr.id = token_id and tr.user_id = auth.uid()
  )
);

-- ==================== market_regimes ====================

create table if not exists public.market_regimes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  regime           text not null check (regime in ('risk_on','risk_off','neutral')),
  btc_dominance    numeric(8,4),
  total_market_vol numeric(24,2),
  funding_avg      numeric(12,6),
  sentiment_score  numeric(6,2),
  metadata         jsonb not null default '{}'::jsonb,
  snapshot_at      timestamptz not null default now()
);

create index if not exists idx_market_regimes_user_snapshot
on public.market_regimes(user_id, snapshot_at desc);

alter table public.market_regimes enable row level security;

drop policy if exists "market_regimes_select_own" on public.market_regimes;
create policy "market_regimes_select_own"
on public.market_regimes for select using (auth.uid() = user_id);

drop policy if exists "market_regimes_insert_own" on public.market_regimes;
create policy "market_regimes_insert_own"
on public.market_regimes for insert with check (auth.uid() = user_id);

-- ==================== risk_state ====================

create table if not exists public.risk_state (
  id                            uuid primary key default gen_random_uuid(),
  user_id                       uuid not null references auth.users(id) on delete cascade,
  capital                       numeric(24,10) not null default 10000,
  pnl_today                     numeric(24,10) not null default 0,
  pnl_this_week                 numeric(24,10) not null default 0,
  trades_today_core             int not null default 0,
  trades_today_satellite        int not null default 0,
  consecutive_losses_satellite  int not null default 0,
  is_paused                     boolean not null default false,
  pause_reason                  text,
  pause_until                   timestamptz,
  last_daily_reset_at           timestamptz not null default now(),
  last_weekly_reset_at          timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint uq_risk_state_user unique (user_id)
);

drop trigger if exists trg_risk_state_updated_at on public.risk_state;
create trigger trg_risk_state_updated_at
before update on public.risk_state
for each row execute function public.set_updated_at();

alter table public.risk_state enable row level security;

drop policy if exists "risk_state_select_own" on public.risk_state;
create policy "risk_state_select_own"
on public.risk_state for select using (auth.uid() = user_id);

drop policy if exists "risk_state_insert_own" on public.risk_state;
create policy "risk_state_insert_own"
on public.risk_state for insert with check (auth.uid() = user_id);

drop policy if exists "risk_state_update_own" on public.risk_state;
create policy "risk_state_update_own"
on public.risk_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ==================== trades (original + engine fields) ====================

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  signal_id uuid references public.signals(id) on delete set null,
  exchange_connection_id uuid references public.exchange_connections(id) on delete set null,
  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled', 'failed')),
  quantity numeric(24,10) not null,
  entry_price numeric(24,10),
  exit_price numeric(24,10),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  pnl_abs numeric(24,10),
  pnl_pct numeric(12,6),
  is_win boolean,
  fees_abs numeric(24,10),
  error_message text,
  execution_mode text not null default 'paper'
    check (execution_mode in ('paper','live','shadow')),
  layer text not null default 'core'
    check (layer in ('core','satellite')),
  slippage_simulated numeric(10,6),
  gas_simulated numeric(18,8),
  latency_ms int,
  entry_reason text,
  exit_reason text,
  wallet_movement_id uuid references public.wallet_movements(id) on delete set null,
  token_health_score_at_entry numeric(6,2),
  wallet_score_at_entry numeric(6,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trades_user_opened_at
on public.trades(user_id, opened_at desc);

create index if not exists idx_trades_user_status
on public.trades(user_id, status);

create index if not exists idx_trades_execution_mode
on public.trades(execution_mode);

create index if not exists idx_trades_layer
on public.trades(layer);

drop trigger if exists trg_trades_updated_at on public.trades;
create trigger trg_trades_updated_at
before update on public.trades
for each row execute function public.set_updated_at();

alter table public.trades enable row level security;

drop policy if exists "trades_select_own" on public.trades;
create policy "trades_select_own"
on public.trades for select
using (auth.uid() = user_id);

drop policy if exists "trades_insert_own" on public.trades;
create policy "trades_insert_own"
on public.trades for insert
with check (auth.uid() = user_id);

drop policy if exists "trades_update_own" on public.trades;
create policy "trades_update_own"
on public.trades for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "trades_delete_own" on public.trades;
create policy "trades_delete_own"
on public.trades for delete
using (auth.uid() = user_id);

-- ==================== signal_outcomes ====================

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

-- ==================== calibration_state ====================

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
