-- Ampliar flash_duration_minutes a 30 días (EVM)

alter table public.lab_sessions drop constraint if exists lab_sessions_flash_duration_minutes_check;

alter table public.lab_sessions
  add constraint lab_sessions_flash_duration_minutes_check
  check (flash_duration_minutes between 5 and 43200);
