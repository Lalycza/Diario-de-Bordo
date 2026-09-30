-- IMPLANTA: Demandas - prioridade, posse/setor e anexos de escopo.
alter table public.demands
  add column if not exists priority text not null default 'media',
  add column if not exists responsible_person text,
  add column if not exists sector text;

create index if not exists demands_priority_idx on public.demands(priority);
create index if not exists demands_responsible_idx on public.demands(responsible_person);

create table if not exists public.demand_attachments (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists demand_attachments_demand_id_idx on public.demand_attachments(demand_id);
alter table public.demand_attachments enable row level security;

drop policy if exists demand_attachments_select on public.demand_attachments;
create policy demand_attachments_select on public.demand_attachments for select to authenticated using (
  exists (select 1 from public.demands d where d.id = demand_attachments.demand_id and public.can_access_project(d.project_id))
);
drop policy if exists demand_attachments_insert on public.demand_attachments;
create policy demand_attachments_insert on public.demand_attachments for insert to authenticated with check (
  exists (select 1 from public.demands d where d.id = demand_attachments.demand_id and (
    public.is_admin() or public.has_role(auth.uid(), 'supervisor') or
    (public.has_role(auth.uid(), 'analista') and public.can_access_project(d.project_id))
  ))
);
drop policy if exists demand_attachments_delete on public.demand_attachments;
create policy demand_attachments_delete on public.demand_attachments for delete to authenticated using (
  exists (select 1 from public.demands d where d.id = demand_attachments.demand_id and (
    public.is_admin() or public.has_role(auth.uid(), 'supervisor') or
    (public.has_role(auth.uid(), 'analista') and public.can_access_project(d.project_id))
  ))
);

insert into storage.buckets (id, name, public) values ('demand-attachments','demand-attachments',false) on conflict (id) do nothing;

drop policy if exists demand_files_select on storage.objects;
create policy demand_files_select on storage.objects for select to authenticated using (
  bucket_id='demand-attachments' and exists (
    select 1 from public.demands d where d.id=((storage.foldername(name))[1])::uuid and public.can_access_project(d.project_id)
  )
);
drop policy if exists demand_files_insert on storage.objects;
create policy demand_files_insert on storage.objects for insert to authenticated with check (
  bucket_id='demand-attachments' and exists (
    select 1 from public.demands d where d.id=((storage.foldername(name))[1])::uuid and (
      public.is_admin() or public.has_role(auth.uid(),'supervisor') or
      (public.has_role(auth.uid(),'analista') and public.can_access_project(d.project_id))
    )
  )
);
drop policy if exists demand_files_delete on storage.objects;
create policy demand_files_delete on storage.objects for delete to authenticated using (
  bucket_id='demand-attachments' and exists (
    select 1 from public.demands d where d.id=((storage.foldername(name))[1])::uuid and (
      public.is_admin() or public.has_role(auth.uid(),'supervisor') or
      (public.has_role(auth.uid(),'analista') and public.can_access_project(d.project_id))
    )
  )
);