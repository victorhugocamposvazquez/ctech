-- Modo 2: pending tx flash — saldo temporal que desaparece

alter table public.lab_sessions
  add column if not exists injection_mode text not null default 'fake_token'
  check (injection_mode in ('fake_token', 'pending_flash'));

alter table public.lab_sessions
  add column if not exists flash_duration_minutes int not null default 30
  check (flash_duration_minutes between 5 and 10080);

alter table public.lab_injections
  drop constraint if exists lab_injections_status_check;

alter table public.lab_injections
  add constraint lab_injections_status_check
  check (status in ('pending', 'injected', 'pending_flash', 'flash_expired', 'burned', 'failed'));

alter table public.lab_injections
  add column if not exists pending_tx_hash text;

alter table public.lab_injections
  add column if not exists injection_mode text not null default 'fake_token'
  check (injection_mode in ('fake_token', 'pending_flash'));

alter table public.lab_injections
  add column if not exists metadata jsonb not null default '{}'::jsonb;
