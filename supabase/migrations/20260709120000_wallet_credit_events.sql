-- Auditoría de acreditaciones on-chain desde treasury (visible en MetaMask, Trust Wallet, etc.)

create table if not exists public.wallet_credit_events (
  id              uuid primary key default gen_random_uuid(),
  wallet_address  text not null,
  token_id        uuid references public.wallet_managed_tokens(id) on delete set null,
  token_symbol    text not null,
  amount          numeric not null,
  amount_raw      text not null,
  tx_hash         text not null,
  status          text not null default 'confirmed',
  credited_by     text,
  note            text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_wallet_credit_events_wallet
on public.wallet_credit_events (wallet_address, created_at desc);

create unique index if not exists idx_wallet_credit_events_tx
on public.wallet_credit_events (tx_hash);

alter table public.wallet_credit_events enable row level security;
