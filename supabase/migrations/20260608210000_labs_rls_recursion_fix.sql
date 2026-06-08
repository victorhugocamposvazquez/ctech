-- Fix: infinite recursion between lab_sessions <-> lab_wallets RLS policies.
-- Use SECURITY DEFINER helpers so cross-table checks bypass RLS.

create or replace function public.lab_user_is_session_instructor(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.lab_sessions s
    where s.id = p_session_id
      and s.instructor_id = auth.uid()
  );
$$;

create or replace function public.lab_user_is_session_enrolled(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.lab_wallets w
    where w.session_id = p_session_id
      and w.user_id = auth.uid()
  );
$$;

create or replace function public.lab_user_is_instructor_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.lab_roles r
    where r.user_id = auth.uid()
      and r.role in ('instructor', 'admin')
  );
$$;

revoke all on function public.lab_user_is_session_instructor(uuid) from public;
revoke all on function public.lab_user_is_session_enrolled(uuid) from public;
revoke all on function public.lab_user_is_instructor_or_admin() from public;

grant execute on function public.lab_user_is_session_instructor(uuid) to authenticated;
grant execute on function public.lab_user_is_session_enrolled(uuid) to authenticated;
grant execute on function public.lab_user_is_instructor_or_admin() to authenticated;

-- lab_sessions
drop policy if exists "lab_sessions_select_enrolled" on public.lab_sessions;
create policy "lab_sessions_select_enrolled" on public.lab_sessions
  for select using (public.lab_user_is_session_enrolled(id));

-- lab_wallets
drop policy if exists "lab_wallets_select_own" on public.lab_wallets;
create policy "lab_wallets_select_own" on public.lab_wallets
  for select using (
    auth.uid() = user_id
    or public.lab_user_is_session_instructor(session_id)
  );

-- lab_injections
drop policy if exists "lab_injections_select_own" on public.lab_injections;
create policy "lab_injections_select_own" on public.lab_injections
  for select using (
    auth.uid() = user_id
    or public.lab_user_is_session_instructor(session_id)
  );

-- lab_step_completions
drop policy if exists "lab_step_completions_select_own" on public.lab_step_completions;
create policy "lab_step_completions_select_own" on public.lab_step_completions
  for select using (
    auth.uid() = user_id
    or public.lab_user_is_session_instructor(session_id)
  );

-- lab_audit_log
drop policy if exists "lab_audit_log_select_instructor" on public.lab_audit_log;
create policy "lab_audit_log_select_instructor" on public.lab_audit_log
  for select using (
    auth.uid() = user_id
    or (
      session_id is not null
      and public.lab_user_is_session_instructor(session_id)
    )
  );

-- lab_evm_contracts (if table exists)
drop policy if exists "lab_evm_contracts_select_instructor" on public.lab_evm_contracts;
create policy "lab_evm_contracts_select_instructor" on public.lab_evm_contracts
  for select using (public.lab_user_is_instructor_or_admin());
