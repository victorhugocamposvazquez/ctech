-- ============================================================
-- Laboratorios de Seguridad — Bootstrap completo (EVM)
-- ============================================================
-- Aplica en un proyecto Supabase NUEVO (SQL Editor o supabase db push).
-- Consolida: labs_security + pending_flash + EVM + flash 30 días.
-- Requiere: auth.users (viene con Supabase Auth).
-- ============================================================

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ==================== lab_roles ====================

create table if not exists public.lab_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'student'
             check (role in ('student', 'instructor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_lab_roles_updated_at on public.lab_roles;
create trigger trg_lab_roles_updated_at
before update on public.lab_roles
for each row execute function public.set_updated_at();

alter table public.lab_roles enable row level security;

drop policy if exists "lab_roles_select_own" on public.lab_roles;
create policy "lab_roles_select_own" on public.lab_roles
  for select using (auth.uid() = user_id);

drop policy if exists "lab_roles_insert_own" on public.lab_roles;
create policy "lab_roles_insert_own" on public.lab_roles
  for insert with check (auth.uid() = user_id);

drop policy if exists "lab_roles_update_own" on public.lab_roles;
create policy "lab_roles_update_own" on public.lab_roles
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==================== lab_sessions ====================

create table if not exists public.lab_sessions (
  id                   uuid primary key default gen_random_uuid(),
  instructor_id        uuid not null references auth.users(id) on delete cascade,
  scenario_type        text not null default 'flash_usdt_evm'
                       check (scenario_type in ('flash_usdt_evm', 'flash_usdt_tron')),
  title                text not null,
  session_code         text not null unique,
  status               text not null default 'draft'
                       check (status in ('draft', 'open', 'injected', 'completed', 'expired')),
  ttl_hours            int not null default 168
                       check (ttl_hours between 1 and 720),
  token_amount         numeric not null default 10000 check (token_amount > 0),
  max_participants     int not null default 30 check (max_participants between 1 and 100),
  network              text not null default 'bsc',
  injection_mode       text not null default 'fake_token'
                       check (injection_mode in ('fake_token', 'pending_flash')),
  flash_duration_minutes int not null default 30
                       check (flash_duration_minutes between 5 and 43200),
  expires_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_lab_sessions_instructor
on public.lab_sessions(instructor_id, created_at desc);

create index if not exists idx_lab_sessions_code
on public.lab_sessions(session_code);

drop trigger if exists trg_lab_sessions_updated_at on public.lab_sessions;
create trigger trg_lab_sessions_updated_at
before update on public.lab_sessions
for each row execute function public.set_updated_at();

alter table public.lab_sessions enable row level security;

drop policy if exists "lab_sessions_select_instructor" on public.lab_sessions;
create policy "lab_sessions_select_instructor" on public.lab_sessions
  for select using (auth.uid() = instructor_id);

drop policy if exists "lab_sessions_insert_instructor" on public.lab_sessions;
create policy "lab_sessions_insert_instructor" on public.lab_sessions
  for insert with check (auth.uid() = instructor_id);

drop policy if exists "lab_sessions_update_instructor" on public.lab_sessions;
create policy "lab_sessions_update_instructor" on public.lab_sessions
  for update using (auth.uid() = instructor_id)
  with check (auth.uid() = instructor_id);

-- ==================== lab_wallets ====================

create table if not exists public.lab_wallets (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references public.lab_sessions(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  wallet_address      text not null,
  consent_accepted_at timestamptz not null,
  consent_version     text not null default '2.0',
  consent_ip          text,
  enrolled_at         timestamptz not null default now(),
  unique (session_id, user_id),
  unique (session_id, wallet_address)
);

create index if not exists idx_lab_wallets_session
on public.lab_wallets(session_id);

create index if not exists idx_lab_wallets_user
on public.lab_wallets(user_id);

alter table public.lab_wallets enable row level security;

drop policy if exists "lab_wallets_select_own" on public.lab_wallets;
create policy "lab_wallets_select_own" on public.lab_wallets
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.lab_sessions ls
      where ls.id = lab_wallets.session_id
        and ls.instructor_id = auth.uid()
    )
  );

drop policy if exists "lab_wallets_insert_own" on public.lab_wallets;
create policy "lab_wallets_insert_own" on public.lab_wallets
  for insert with check (auth.uid() = user_id);

drop policy if exists "lab_sessions_select_enrolled" on public.lab_sessions;
create policy "lab_sessions_select_enrolled" on public.lab_sessions
  for select using (
    exists (
      select 1 from public.lab_wallets lw
      where lw.session_id = lab_sessions.id
        and lw.user_id = auth.uid()
    )
  );

-- ==================== lab_injections ====================

create table if not exists public.lab_injections (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.lab_sessions(id) on delete cascade,
  wallet_id        uuid not null references public.lab_wallets(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  amount           numeric not null,
  tx_hash          text,
  pending_tx_hash  text,
  contract_address text,
  injection_mode   text not null default 'fake_token'
                   check (injection_mode in ('fake_token', 'pending_flash')),
  metadata         jsonb not null default '{}'::jsonb,
  injected_at      timestamptz,
  expires_at       timestamptz not null,
  burned_at        timestamptz,
  burn_tx_hash     text,
  status           text not null default 'pending'
                   check (status in (
                     'pending', 'injected', 'pending_flash',
                     'flash_expired', 'burned', 'failed'
                   )),
  error_message    text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_lab_injections_session
on public.lab_injections(session_id);

drop index if exists idx_lab_injections_expires;
create index idx_lab_injections_expires
on public.lab_injections(expires_at)
where status in ('injected', 'pending_flash') and burned_at is null;

alter table public.lab_injections enable row level security;

drop policy if exists "lab_injections_select_own" on public.lab_injections;
create policy "lab_injections_select_own" on public.lab_injections
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.lab_sessions ls
      where ls.id = lab_injections.session_id
        and ls.instructor_id = auth.uid()
    )
  );

-- ==================== lab_step_completions ====================

create table if not exists public.lab_step_completions (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.lab_sessions(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  step_id      text not null,
  completed_at timestamptz not null default now(),
  response     jsonb not null default '{}'::jsonb,
  score        int not null default 0,
  unique (session_id, user_id, step_id)
);

create index if not exists idx_lab_step_completions_session
on public.lab_step_completions(session_id, user_id);

alter table public.lab_step_completions enable row level security;

drop policy if exists "lab_step_completions_select_own" on public.lab_step_completions;
create policy "lab_step_completions_select_own" on public.lab_step_completions
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.lab_sessions ls
      where ls.id = lab_step_completions.session_id
        and ls.instructor_id = auth.uid()
    )
  );

drop policy if exists "lab_step_completions_insert_own" on public.lab_step_completions;
create policy "lab_step_completions_insert_own" on public.lab_step_completions
  for insert with check (auth.uid() = user_id);

drop policy if exists "lab_step_completions_update_own" on public.lab_step_completions;
create policy "lab_step_completions_update_own" on public.lab_step_completions
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==================== lab_audit_log ====================

create table if not exists public.lab_audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  session_id  uuid references public.lab_sessions(id) on delete set null,
  action      text not null,
  metadata    jsonb not null default '{}'::jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_lab_audit_log_session
on public.lab_audit_log(session_id, created_at desc);

alter table public.lab_audit_log enable row level security;

drop policy if exists "lab_audit_log_select_instructor" on public.lab_audit_log;
create policy "lab_audit_log_select_instructor" on public.lab_audit_log
  for select using (
    exists (
      select 1 from public.lab_sessions ls
      where ls.id = lab_audit_log.session_id
        and ls.instructor_id = auth.uid()
    )
    or auth.uid() = user_id
  );

drop policy if exists "lab_audit_log_insert_authenticated" on public.lab_audit_log;
create policy "lab_audit_log_insert_authenticated" on public.lab_audit_log
  for insert with check (auth.uid() = user_id);
