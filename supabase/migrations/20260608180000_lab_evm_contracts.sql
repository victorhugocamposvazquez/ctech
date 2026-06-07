-- Contratos FlashUSDTLab desplegados desde el backoffice (por red)

create table if not exists public.lab_evm_contracts (
  id                   uuid primary key default gen_random_uuid(),
  network              text not null check (network in ('bsc', 'ethereum', 'polygon')),
  contract_address     text not null,
  deploy_tx_hash       text not null,
  deployed_by          uuid references auth.users(id) on delete set null,
  deployed_at          timestamptz not null default now(),
  verification_status  text not null default 'unverified'
                       check (verification_status in ('unverified', 'pending', 'verified', 'failed')),
  verification_guid    text,
  verified_at          timestamptz,
  verification_error   text,
  is_active            boolean not null default true,
  compiler_version     text,
  metadata             jsonb not null default '{}'::jsonb
);

create unique index if not exists idx_lab_evm_contracts_active_network
on public.lab_evm_contracts (network)
where is_active = true;

create index if not exists idx_lab_evm_contracts_network
on public.lab_evm_contracts (network, deployed_at desc);

alter table public.lab_evm_contracts enable row level security;

-- Lectura: instructores/admins (misma lógica que lab_sessions)
drop policy if exists "lab_evm_contracts_select_instructor" on public.lab_evm_contracts;
create policy "lab_evm_contracts_select_instructor" on public.lab_evm_contracts
  for select using (
    exists (
      select 1 from public.lab_roles lr
      where lr.user_id = auth.uid()
        and lr.role in ('instructor', 'admin')
    )
  );
