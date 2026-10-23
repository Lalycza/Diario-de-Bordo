-- Keep submodules added inside a project isolated from the shared product catalog.
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
    select 1
    from public.modules m
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
      select 1
      from public.project_modules pm
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
    select 1
    from public.modules m
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
