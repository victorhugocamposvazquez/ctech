-- ============================================================
-- Fase 0 — Integridad estadística
--
-- 1. signal_outcomes.signal_source: el calibrador ya seleccionaba esta
--    columna (fallaba en silencio) y el tracker ahora la escribe.
-- 2. Purga del SmartMoneySimulator: las wallets sintéticas (address
--    'sim-%') inyectaban compras que confirmaban las señales del propio
--    ciclo. Se eliminan sus movimientos y scores y se desactivan.
-- 3. Marcado preFase0: todos los trades y outcomes generados antes de
--    esta migración se etiquetan como contaminados para poder excluirlos
--    de cualquier medición de edge (las métricas previas mezclaban
--    confluencia sintética, salidas sin fricción y sin stop-loss).
-- ============================================================

-- 1. Columna signal_source
alter table public.signal_outcomes
  add column if not exists signal_source text;

-- 2. Purga de smart money sintético
delete from public.wallet_movements wm
using public.tracked_wallets tw
where wm.wallet_id = tw.id
  and tw.address like 'sim-%';

delete from public.wallet_scores ws
using public.tracked_wallets tw
where ws.wallet_id = tw.id
  and tw.address like 'sim-%';

update public.tracked_wallets
set is_active = false
where address like 'sim-%';

-- 3. Marcar datos históricos como pre-Fase 0 (no aptos para medir edge)
update public.trades
set metadata = coalesce(metadata, '{}'::jsonb) || '{"preFase0": true}'::jsonb
where metadata is null or not (metadata ? 'preFase0');

update public.signal_outcomes
set metadata = coalesce(metadata, '{}'::jsonb) || '{"preFase0": true}'::jsonb
where metadata is null or not (metadata ? 'preFase0');
