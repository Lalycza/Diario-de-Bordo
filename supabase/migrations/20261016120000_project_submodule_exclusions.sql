-- Record submodule removals per project without deleting shared catalog rows
-- or training history. The UI hides the excluded submodule only in that project.
create table if not exists public.project_submodule_exclusions (
  project_id uuid not null references public.projects(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  submodule_id uuid not null references public.submodules(id) on delete cascade,
  excluded_by uuid null references auth.users(id) on delete set null,
  excluded_at timestamptz not null default now(),
  primary key (project_id, submodule_id)
);

alter table public.project_submodule_exclusions enable row level security;

drop policy if exists project_submodule_exclusions_select on public.project_submodule_exclusions;
create policy project_submodule_exclusions_select
  on public.project_submodule_exclusions
  for select to authenticated
  using (can_access_project(project_id));

drop policy if exists project_submodule_exclusions_write on public.project_submodule_exclusions;
create policy project_submodule_exclusions_write
  on public.project_submodule_exclusions
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
