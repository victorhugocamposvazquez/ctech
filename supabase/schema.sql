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
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trades_user_opened_at
on public.trades(user_id, opened_at desc);

create index if not exists idx_trades_user_status
on public.trades(user_id, status);

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
