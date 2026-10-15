-- Controle de horas opcional por projeto. Esta migration é versionada no repositório;
-- não foi aplicada automaticamente a nenhum banco.
create table if not exists public.project_hour_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  enabled boolean not null default false,
  initial_sold_hours numeric(10,2) not null default 0 check (initial_sold_hours >= 0),
  initial_bonus_hours numeric(10,2) not null default 0 check (initial_bonus_hours >= 0),
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_hour_credits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  credit_type text not null check (credit_type in ('sold','bonus')),
  hours numeric(10,2) not null check (hours > 0),
  entry_date date not null default current_date,
  description text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists project_hour_credits_project_date_idx
  on public.project_hour_credits(project_id, entry_date desc, created_at desc);

alter table public.project_hour_settings enable row level security;
alter table public.project_hour_credits enable row level security;

drop policy if exists "project_hour_settings_select_accessible" on public.project_hour_settings;
create policy "project_hour_settings_select_accessible"
  on public.project_hour_settings for select to authenticated
  using (public.can_access_project(project_id));

drop policy if exists "project_hour_settings_insert_editors" on public.project_hour_settings;
create policy "project_hour_settings_insert_editors"
  on public.project_hour_settings for insert to authenticated
  with check (
    public.is_admin()
    or public.has_role(auth.uid(), 'supervisor')
    or (public.has_role(auth.uid(), 'analista') and public.can_access_project(project_id))
  );

drop policy if exists "project_hour_settings_update_editors" on public.project_hour_settings;
create policy "project_hour_settings_update_editors"
  on public.project_hour_settings for update to authenticated
  using (
    public.is_admin()
    or public.has_role(auth.uid(), 'supervisor')
    or (public.has_role(auth.uid(), 'analista') and public.can_access_project(project_id))
  )
  with check (
    public.is_admin()
    or public.has_role(auth.uid(), 'supervisor')
    or (public.has_role(auth.uid(), 'analista') and public.can_access_project(project_id))
  );

drop policy if exists "project_hour_credits_select_accessible" on public.project_hour_credits;
create policy "project_hour_credits_select_accessible"
  on public.project_hour_credits for select to authenticated
  using (public.can_access_project(project_id));

drop policy if exists "project_hour_credits_insert_editors" on public.project_hour_credits;
create policy "project_hour_credits_insert_editors"
  on public.project_hour_credits for insert to authenticated
  with check (
    public.is_admin()
    or public.has_role(auth.uid(), 'supervisor')
    or (public.has_role(auth.uid(), 'analista') and public.can_access_project(project_id))
  );

drop policy if exists "project_hour_credits_delete_editors" on public.project_hour_credits;
create policy "project_hour_credits_delete_editors"
  on public.project_hour_credits for delete to authenticated
  using (
    public.is_admin()
    or public.has_role(auth.uid(), 'supervisor')
    or (public.has_role(auth.uid(), 'analista') and public.can_access_project(project_id))
  );

grant select, insert, update, delete on public.project_hour_settings to authenticated;
grant select, insert, delete on public.project_hour_credits to authenticated;
