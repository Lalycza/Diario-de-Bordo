-- Isolate custom submodules created in a project and keep shared product rows intact.
-- Project-created modules must have their own owner and never be product rows.
alter table public.modules
  add column if not exists project_id uuid null references public.projects(id) on delete cascade;

create index if not exists modules_project_id_idx
  on public.modules(project_id);

drop policy if exists modules_project_scoped_write on public.modules;
create policy modules_project_scoped_write
on public.modules
for all
to authenticated
using (
  project_id is not null
  and can_access_project(project_id)
  and (
    is_admin()
    or has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'supervisor'::app_role)
    or has_role(auth.uid(), 'analista'::app_role)
  )
)
with check (
  project_id is not null
  and product_id is null
  and can_access_project(project_id)
  and (
    is_admin()
    or has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'supervisor'::app_role)
    or has_role(auth.uid(), 'analista'::app_role)
  )
);

-- Persistent per-project exclusions; never delete the shared catalog row.
create table if not exists public.project_module_exclusions (
  project_id uuid not null references public.projects(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  excluded_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, module_id)
);

create table if not exists public.project_submodule_exclusions (
  project_id uuid not null references public.projects(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  submodule_id uuid not null references public.submodules(id) on delete cascade,
  excluded_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, submodule_id)
);

alter table public.project_module_exclusions enable row level security;
alter table public.project_submodule_exclusions enable row level security;

drop policy if exists project_module_exclusions_project_access on public.project_module_exclusions;
create policy project_module_exclusions_project_access
on public.project_module_exclusions
for all to authenticated
using (
  can_access_project(project_id)
  and (
    is_admin()
    or has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'supervisor'::app_role)
    or has_role(auth.uid(), 'analista'::app_role)
  )
)
with check (
  can_access_project(project_id)
  and (
    is_admin()
    or has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'supervisor'::app_role)
    or has_role(auth.uid(), 'analista'::app_role)
  )
);

drop policy if exists project_submodule_exclusions_project_access on public.project_submodule_exclusions;
create policy project_submodule_exclusions_project_access
on public.project_submodule_exclusions
for all to authenticated
using (
  can_access_project(project_id)
  and (
    is_admin()
    or has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'supervisor'::app_role)
    or has_role(auth.uid(), 'analista'::app_role)
  )
)
with check (
  can_access_project(project_id)
  and (
    is_admin()
    or has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'supervisor'::app_role)
    or has_role(auth.uid(), 'analista'::app_role)
  )
);

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
