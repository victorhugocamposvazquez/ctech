-- ============================================================
-- Eliminación completa del módulo de Laboratorios de Seguridad (Flash USDT).
-- Decisión de producto: se retira por riesgo de mal uso. El sistema vuelve a
-- centrarse exclusivamente en el motor de inversiones legales.
-- ============================================================

-- Tablas (orden indiferente: CASCADE limpia FKs, índices, políticas y triggers).
drop table if exists public.lab_audit_log cascade;
drop table if exists public.lab_step_completions cascade;
drop table if exists public.lab_injections cascade;
drop table if exists public.lab_wallets cascade;
drop table if exists public.lab_evm_contracts cascade;
drop table if exists public.lab_evm_treasury cascade;
drop table if exists public.lab_sessions cascade;
drop table if exists public.lab_roles cascade;

-- Funciones SECURITY DEFINER específicas del lab (RLS helpers).
drop function if exists public.lab_user_is_session_instructor(uuid);
drop function if exists public.lab_user_is_session_enrolled(uuid);
drop function if exists public.lab_user_is_instructor_or_admin();
