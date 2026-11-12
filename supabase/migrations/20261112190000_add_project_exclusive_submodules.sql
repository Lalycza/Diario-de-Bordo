-- Allow project-specific submodules attached to an existing catalog module.
-- A custom submodule is visible only inside the project that owns it.
alter table public.submodules
  add column if not exists project_id uuid null
  references public.projects(id) on delete cascade;

create index if not exists submodules_project_id_idx
  on public.submodules(project_id);

create unique index if not exists submodules_project_module_name_unique
  on public.submodules(project_id, module_id, lower(trim(name)))
  where project_id is not null;

-- Catalog writes remain limited to shared submodules.
drop policy if exists submodules_catalog_write on public.submodules;
create policy submodules_catalog_write
on public.submodules
for all
to authenticated
using (
  project_id is null
  and exists (
    select 1
    from public.modules m
    join public.products p on p.id = m.product_id
    where m.id = submodules.module_id
      and can_manage_business_unit(p.business_unit)
  )
)
with check (
  project_id is null
  and exists (
    select 1
    from public.modules m
    join public.products p on p.id = m.product_id
    where m.id = submodules.module_id
      and can_manage_business_unit(p.business_unit)
  )
);

-- Keep catalog submodules visible by business unit, but never expose a
-- project-specific submodule through the shared catalog visibility rule.
drop policy if exists submodules_select on public.submodules;
create policy submodules_select
on public.submodules
for select
to authenticated
using (
  (
    project_id is null
    and exists (
      select 1
      from public.modules m
      left join public.products p on p.id = m.product_id
      where m.id = submodules.module_id
        and p.id is not null
        and can_access_business_unit(p.business_unit)
    )
  )
  or (
    project_id is not null
    and can_access_project(project_id)
  )
  or exists (
    select 1
    from public.modules m
    where m.id = submodules.module_id
      and m.project_id is not null
      and can_access_project(m.project_id)
  )
);

-- Project-exclusive submodules may only be managed by authorized project
-- managers and only when the parent catalog module is linked to that project.
drop policy if exists submodules_project_scoped_write on public.submodules;
create policy submodules_project_scoped_write
on public.submodules
for all
to authenticated
using (
  (
    project_id is not null
    and can_access_project(project_id)
    and exists (
      select 1
      from public.project_modules pm
      join public.modules m on m.id = pm.module_id
      where pm.project_id = submodules.project_id
        and pm.module_id = submodules.module_id
        and m.project_id is null
        and m.product_id is not null
    )
    and (
      is_central_admin()
      or has_role(auth.uid(), 'admin'::app_role)
      or has_role(auth.uid(), 'supervisor'::app_role)
      or has_role(auth.uid(), 'analista'::app_role)
    )
  )
  or exists (
    select 1
    from public.modules m
    where m.id = submodules.module_id
      and m.project_id is not null
      and m.product_id is null
      and can_access_project(m.project_id)
      and (
        is_central_admin()
        or has_role(auth.uid(), 'admin'::app_role)
        or has_role(auth.uid(), 'supervisor'::app_role)
        or has_role(auth.uid(), 'analista'::app_role)
      )
  )
)
with check (
  (
    project_id is not null
    and can_access_project(project_id)
    and exists (
      select 1
      from public.project_modules pm
      join public.modules m on m.id = pm.module_id
      where pm.project_id = submodules.project_id
        and pm.module_id = submodules.module_id
        and m.project_id is null
        and m.product_id is not null
    )
    and (
      is_central_admin()
      or has_role(auth.uid(), 'admin'::app_role)
      or has_role(auth.uid(), 'supervisor'::app_role)
      or has_role(auth.uid(), 'analista'::app_role)
    )
  )
  or exists (
    select 1
    from public.modules m
    where m.id = submodules.module_id
      and m.project_id is not null
      and m.product_id is null
      and can_access_project(m.project_id)
      and (
        is_central_admin()
        or has_role(auth.uid(), 'admin'::app_role)
        or has_role(auth.uid(), 'supervisor'::app_role)
        or has_role(auth.uid(), 'analista'::app_role)
      )
  )
);
