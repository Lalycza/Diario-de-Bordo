-- Add project type PI and project-scoped modules/submodules.
-- Product catalog rows remain product-scoped; PI rows belong to exactly one project.
alter table public.projects
  drop constraint if exists projects_project_type_check;
alter table public.projects
  add constraint projects_project_type_check
  check (project_type = any (array['implantacao'::text, 'suporte'::text, 'consultoria'::text, 'pi'::text]));

alter table public.modules
  add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.modules
  alter column product_id drop not null;
alter table public.modules
  drop constraint if exists modules_scope_check;
alter table public.modules
  add constraint modules_scope_check
  check (
    (product_id is not null and project_id is null)
    or
    (product_id is null and project_id is not null)
  );

create unique index if not exists modules_project_local_name_uidx
  on public.modules (project_id, lower(name))
  where project_id is not null;

-- Analysts may mutate modules only when they are scoped to a project they can access.
drop policy if exists modules_project_scoped_write on public.modules;
create policy modules_project_scoped_write
  on public.modules for all to authenticated
  using (
    project_id is not null and product_id is null
    and (
      is_admin()
      or has_role(auth.uid(), 'supervisor'::app_role)
      or (has_role(auth.uid(), 'analista'::app_role) and can_access_project(project_id))
    )
  )
  with check (
    project_id is not null and product_id is null
    and (
      is_admin()
      or has_role(auth.uid(), 'supervisor'::app_role)
      or (has_role(auth.uid(), 'analista'::app_role) and can_access_project(project_id))
    )
  );

drop policy if exists submodules_project_scoped_write on public.submodules;
create policy submodules_project_scoped_write
  on public.submodules for all to authenticated
  using (
    exists (
      select 1
      from public.modules m
      where m.id = submodules.module_id
        and m.project_id is not null
        and m.product_id is null
        and (
          is_admin()
          or has_role(auth.uid(), 'supervisor'::app_role)
          or (has_role(auth.uid(), 'analista'::app_role) and can_access_project(m.project_id))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.modules m
      where m.id = submodules.module_id
        and m.project_id is not null
        and m.product_id is null
        and (
          is_admin()
          or has_role(auth.uid(), 'supervisor'::app_role)
          or (has_role(auth.uid(), 'analista'::app_role) and can_access_project(m.project_id))
        )
    )
  );
