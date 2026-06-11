-- ============================================================
-- Scheduler de precisión con pg_cron + pg_net
--
-- Sustituye a GitHub Actions como disparador principal (queda como
-- respaldo). Dos frecuencias:
--   1. ctech-cycle-15min  → /api/cron/cycle      (detección + entradas)
--   2. ctech-positions-1m → /api/cron/positions  (stops/TPs cada minuto)
--
-- El CRON_SECRET se guarda en Supabase Vault con nombre 'cron_secret'
-- (NUNCA en este fichero). Antes de aplicar, ejecutar una vez:
--   select vault.create_secret('<valor>', 'cron_secret');
--
-- El endpoint /api/cron/cycle tiene guard de idempotencia (<10 min se
-- ignora), por lo que la convivencia con GitHub Actions es segura.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotente: elimina jobs previos con el mismo nombre si existen
do $$
begin
  perform cron.unschedule('ctech-cycle-15min');
exception when others then null;
end $$;

do $$
begin
  perform cron.unschedule('ctech-positions-1min');
exception when others then null;
end $$;

select cron.schedule(
  'ctech-cycle-15min',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://ctech-lac.vercel.app/api/cron/cycle',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 170000
  )
  $$
);

select cron.schedule(
  'ctech-positions-1min',
  '* * * * *',
  $$
  select net.http_get(
    url := 'https://ctech-lac.vercel.app/api/cron/positions',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 110000
  )
  $$
);
