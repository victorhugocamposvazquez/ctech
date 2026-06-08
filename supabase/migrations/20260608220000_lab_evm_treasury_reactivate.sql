-- Reactiva la última treasury desactivada si no hay ninguna activa (recuperación tras fallo de guardado).

do $$
declare
  latest_id uuid;
  active_count int;
begin
  select count(*) into active_count
  from public.lab_evm_treasury
  where is_active = true;

  if active_count = 0 then
    select id into latest_id
    from public.lab_evm_treasury
    order by updated_at desc
    limit 1;

    if latest_id is not null then
      update public.lab_evm_treasury
      set is_active = true
      where id = latest_id;
    end if;
  end if;
end $$;
