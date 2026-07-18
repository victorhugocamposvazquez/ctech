-- Reversión de créditos / transferencias simuladas desde backoffice

alter table public.wallet_transfer_events
  add column if not exists reversed_at timestamptz,
  add column if not exists reverses_event_id uuid
    references public.wallet_transfer_events(id) on delete set null;

create index if not exists idx_wallet_transfer_events_reversible
  on public.wallet_transfer_events (detected_at desc)
  where is_simulated = true and reversed_at is null and reverses_event_id is null;
