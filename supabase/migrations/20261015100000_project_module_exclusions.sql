-- Preserve project-specific module exclusions without deleting product catalog records,
-- project-module planning dates, or training history.
create table if not exists public.project_module_exclusions (
  project_id uuid not null references public.projects(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  excluded_by uuid null references auth.users(id) on delete set null,
  excluded_at timestamptz not null default now(),
  primary key (project_id, module_id)
);

alter table public.project_module_exclusions enable row level security;

drop policy if exists project_module_exclusions_select on public.project_module_exclusions;
create policy project_module_exclusions_select
  on public.project_module_exclusions
  for select to authenticated
  using (can_access_project(project_id));

drop policy if exists project_module_exclusions_write on public.project_module_exclusions;
create policy project_module_exclusions_write
  on public.project_module_exclusions
  for all to authenticated
  using (
    is_admin()
    or has_role(auth.uid(), 'supervisor'::app_role)
    or (has_role(auth.uid(), 'analista'::app_role) and can_access_project(project_id))
  )
  with check (
    is_admin()
    or has_role(auth.uid(), 'supervisor'::app_role)
    or (has_role(auth.uid(), 'analista'::app_role) and can_access_project(project_id))
  );
