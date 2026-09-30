-- IMPLANTA: Demandas por projeto, com histórico de alterações.
create table if not exists public.demands (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  os_number text,
  scope text not null,
  status text not null default 'em_levantamento',
  delivery_deadline date,
  scope_raised_by text,
  scope_raised_at date,
  scope_approved_by text,
  scope_approved_at date,
  commercial_proposal_sent_by text,
  commercial_proposal_sent_at date,
  commercial_proposal_approved_by text,
  commercial_proposal_approved_at date,
  development_evaluated_by text,
  development_evaluated_at date,
  development_estimated_time text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demands_project_id_idx on public.demands(project_id);
create index if not exists demands_status_idx on public.demands(status);
create index if not exists demands_deadline_idx on public.demands(delivery_deadline);

create table if not exists public.demand_history (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands(id) on delete cascade,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  status text,
  snapshot jsonb not null
);

create or replace function public.touch_demand_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists demands_touch_updated_at on public.demands;
create trigger demands_touch_updated_at
before update on public.demands
for each row execute function public.touch_demand_updated_at();

create or replace function public.capture_demand_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.demand_history(demand_id, changed_by, status, snapshot)
  values (
    new.id,
    auth.uid(),
    new.status,
    to_jsonb(new)
  );
  return new;
end;
$$;

drop trigger if exists demands_history_after_write on public.demands;
create trigger demands_history_after_write
after insert or update on public.demands
for each row execute function public.capture_demand_history();

alter table public.demands enable row level security;
alter table public.demand_history enable row level security;

drop policy if exists demands_select on public.demands;
create policy demands_select on public.demands
for select to authenticated
using (public.can_access_project(project_id));

drop policy if exists demands_insert on public.demands;
create policy demands_insert on public.demands
for insert to authenticated
with check (
  public.is_admin()
  or public.has_role(auth.uid(), 'supervisor')
  or (public.has_role(auth.uid(), 'analista') and public.can_access_project(project_id))
);

drop policy if exists demands_update on public.demands;
create policy demands_update on public.demands
for update to authenticated
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

drop policy if exists demands_delete on public.demands;
create policy demands_delete on public.demands
for delete to authenticated
using (
  public.is_admin()
  or public.has_role(auth.uid(), 'supervisor')
  or (public.has_role(auth.uid(), 'analista') and public.can_access_project(project_id))
);

drop policy if exists demand_history_select on public.demand_history;
create policy demand_history_select on public.demand_history
for select to authenticated
using (
  exists (
    select 1 from public.demands d
    where d.id = demand_history.demand_id
      and public.can_access_project(d.project_id)
  )
);
