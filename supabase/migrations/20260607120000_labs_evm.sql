-- Migración EVM: renombrar dirección wallet y actualizar constraints de red/escenario

alter table public.lab_wallets
  rename column tron_address to wallet_address;

alter table public.lab_sessions drop constraint if exists lab_sessions_scenario_type_check;
alter table public.lab_sessions
  add constraint lab_sessions_scenario_type_check
  check (scenario_type in ('flash_usdt_evm', 'flash_usdt_tron'));

alter table public.lab_sessions alter column scenario_type set default 'flash_usdt_evm';
alter table public.lab_sessions alter column network set default 'bsc';

update public.lab_sessions
set scenario_type = 'flash_usdt_evm', network = 'bsc'
where scenario_type = 'flash_usdt_tron' or network = 'tron';
