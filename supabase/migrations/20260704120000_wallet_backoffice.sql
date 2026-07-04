-- Backoffice: gestión de tokens simulados (USDT, USDC, BTC, ETH) y notificaciones de transferencias

-- ==================== wallet_managed_tokens ====================

create table if not exists public.wallet_managed_tokens (
  id               uuid primary key default gen_random_uuid(),
  symbol           text not null,
  name             text not null,
  contract_address text not null,
  network          text not null default 'bsc',
  decimals         int not null default 18,
  logo_url         text,
  is_active        boolean not null default true,
  sort_order       int not null default 0,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (symbol, network)
);

create index if not exists idx_wallet_managed_tokens_active
on public.wallet_managed_tokens (is_active, sort_order);

drop trigger if exists trg_wallet_managed_tokens_updated_at on public.wallet_managed_tokens;
create trigger trg_wallet_managed_tokens_updated_at
before update on public.wallet_managed_tokens
for each row execute function public.set_updated_at();

alter table public.wallet_managed_tokens enable row level security;

drop policy if exists "wallet_managed_tokens_select_active" on public.wallet_managed_tokens;
create policy "wallet_managed_tokens_select_active"
on public.wallet_managed_tokens for select
using (is_active = true);

-- ==================== wallet_registered_addresses ====================

create table if not exists public.wallet_registered_addresses (
  id                 uuid primary key default gen_random_uuid(),
  wallet_address     text not null,
  user_id            uuid references auth.users(id) on delete set null,
  label              text,
  last_scanned_block bigint not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (wallet_address)
);

create index if not exists idx_wallet_registered_addresses_user
on public.wallet_registered_addresses (user_id);

drop trigger if exists trg_wallet_registered_addresses_updated_at on public.wallet_registered_addresses;
create trigger trg_wallet_registered_addresses_updated_at
before update on public.wallet_registered_addresses
for each row execute function public.set_updated_at();

alter table public.wallet_registered_addresses enable row level security;

-- ==================== wallet_transfer_events ====================

create table if not exists public.wallet_transfer_events (
  id             uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  token_id       uuid not null references public.wallet_managed_tokens(id) on delete cascade,
  tx_hash        text not null,
  log_index      int not null,
  from_address   text not null,
  to_address     text not null,
  amount_raw     text not null,
  amount         numeric not null,
  block_number   bigint,
  detected_at    timestamptz not null default now(),
  unique (tx_hash, log_index)
);

create index if not exists idx_wallet_transfer_events_wallet
on public.wallet_transfer_events (wallet_address, detected_at desc);

-- ==================== wallet_notifications ====================

create table if not exists public.wallet_notifications (
  id                uuid primary key default gen_random_uuid(),
  wallet_address    text not null,
  type              text not null default 'transfer_in'
    check (type in ('transfer_in', 'transfer_out', 'system')),
  title             text not null,
  body              text not null,
  payload           jsonb not null default '{}'::jsonb,
  read_at           timestamptz,
  transfer_event_id uuid references public.wallet_transfer_events(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists idx_wallet_notifications_wallet_unread
on public.wallet_notifications (wallet_address, created_at desc)
where read_at is null;

create index if not exists idx_wallet_notifications_wallet_all
on public.wallet_notifications (wallet_address, created_at desc);

alter table public.wallet_notifications enable row level security;

-- ==================== Seed: tokens con símbolos y direcciones reales en BSC ====================

insert into public.wallet_managed_tokens
  (symbol, name, contract_address, network, decimals, logo_url, is_active, sort_order)
values
  (
    'USDT',
    'Tether USD',
    '0x55d398326f99059fF775485246999027B3197955',
    'bsc',
    18,
    '/wallet/icons/usdt.svg',
    true,
    1
  ),
  (
    'USDC',
    'USD Coin',
    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    'bsc',
    18,
    '/wallet/icons/usdc.svg',
    true,
    2
  ),
  (
    'BTC',
    'Bitcoin',
    '0x7130d2A12B9BCbAEdf2C6c659494615EF9790',
    'bsc',
    18,
    '/wallet/icons/btc.svg',
    true,
    3
  ),
  (
    'ETH',
    'Ethereum',
    '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    'bsc',
    18,
    '/wallet/icons/eth.svg',
    true,
    4
  )
on conflict (symbol, network) do nothing;
