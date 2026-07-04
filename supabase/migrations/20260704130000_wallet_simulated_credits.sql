-- Créditos simulados desde backoffice (suman al saldo en app + notificación)

alter table public.wallet_transfer_events
  add column if not exists is_simulated boolean not null default false;

create index if not exists idx_wallet_transfer_events_simulated
  on public.wallet_transfer_events (wallet_address, token_id)
  where is_simulated = true;
