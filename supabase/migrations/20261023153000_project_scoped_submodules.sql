-- Isolate custom submodules created in a project and keep shared product rows intact.
alter table public.submodules
  add column if not exists project_id uuid null references public.projects(id) on delete cascade;

create index if not exists submodules_project_id_idx
  on public.submodules(project_id);

drop policy if exists submodules_project_scoped_write on public.submodules;
create policy submodules_project_scoped_write
on public.submodules
for all
to authenticated
using (
  (
    project_id is not null
    and can_access_project(project_id)
    and (
      is_admin()
      or has_role(auth.uid(), 'admin'::app_role)
      or has_role(auth.uid(), 'supervisor'::app_role)
      or has_role(auth.uid(), 'analista'::app_role)
    )
  )
  or exists (
    select 1 from public.modules m
    where m.id = submodules.module_id
      and m.project_id is not null
      and m.product_id is null
      and (
        is_admin()
        or has_role(auth.uid(), 'admin'::app_role)
        or has_role(auth.uid(), 'supervisor'::app_role)
        or (has_role(auth.uid(), 'analista'::app_role) and can_access_project(m.project_id))
      )
  )
)
with check (
  (
    project_id is not null
    and can_access_project(project_id)
    and exists (
      select 1 from public.project_modules pm
      where pm.project_id = submodules.project_id
        and pm.module_id = submodules.module_id
    )
    and (
      is_admin()
      or has_role(auth.uid(), 'admin'::app_role)
      or has_role(auth.uid(), 'supervisor'::app_role)
      or has_role(auth.uid(), 'analista'::app_role)
    )
  )
  or exists (
    select 1 from public.modules m
    where m.id = submodules.module_id
      and m.project_id is not null
      and m.product_id is null
      and (
        is_admin()
        or has_role(auth.uid(), 'admin'::app_role)
        or has_role(auth.uid(), 'supervisor'::app_role)
        or (has_role(auth.uid(), 'analista'::app_role) and can_access_project(m.project_id))
      )
  )
);

-- Restore Planilha Orçamentária submodules to PH2 Gestão when missing.
-- Copy only from the sibling PH2 Gestão Customizado catalog; never delete or alter source rows.
insert into public.submodules (name, module_id, code, description, active, legacy_id)
select src.name, target_module.id, src.code, src.description, true, null
from public.submodules src
join public.modules source_module on source_module.id = src.module_id
join public.products source_product on source_product.id = source_module.product_id
join public.modules target_module on lower(trim(target_module.name)) = lower(trim(source_module.name))
join public.products target_product on target_product.id = target_module.product_id
where lower(trim(source_product.name)) = lower('PH2 Gestão Customizado')
  and lower(trim(target_product.name)) = lower('PH2 Gestão')
  and lower(trim(source_module.name)) = lower('Financeiro')
  and lower(trim(target_module.name)) = lower('Financeiro')
  and src.name ilike 'Planilha Orçamentária%'
  and not exists (
    select 1 from public.submodules existing
    where existing.module_id = target_module.id
      and lower(trim(existing.name)) = lower(trim(src.name))
  );
