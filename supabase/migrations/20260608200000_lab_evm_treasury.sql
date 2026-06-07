-- Treasury del lab — configuración manual desde backoffice (instructor)

create table if not exists public.lab_evm_treasury (
  id                   uuid primary key default gen_random_uuid(),
  treasury_address     text not null,
  treasury_private_key text not null,
  label                text,
  notes                text,
  configured_by        uuid references auth.users(id) on delete set null,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create unique index if not exists idx_lab_evm_treasury_active
on public.lab_evm_treasury ((true))
where is_active = true;

drop trigger if exists trg_lab_evm_treasury_updated_at on public.lab_evm_treasury;
create trigger trg_lab_evm_treasury_updated_at
before update on public.lab_evm_treasury
for each row execute function public.set_updated_at();

alter table public.lab_evm_treasury enable row level security;

-- Sin políticas de lectura directa: solo service role vía API
