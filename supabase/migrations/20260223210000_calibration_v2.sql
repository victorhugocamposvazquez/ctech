-- ============================================================
-- Calibration state v2: exposure + detector interaction
-- ============================================================

alter table public.calibration_state
  add column if not exists exposure_momentum_pct numeric not null default 50,
  add column if not exists exposure_early_pct    numeric not null default 50,
  add column if not exists detector_interaction  jsonb;
