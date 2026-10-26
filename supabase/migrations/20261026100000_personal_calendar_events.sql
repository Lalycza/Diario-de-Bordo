-- Agenda pessoal do IMPLANTA: compromissos isolados por usuário.
create table if not exists public.personal_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  event_type text not null default 'reuniao'
    check (event_type in ('reuniao', 'treinamento', 'tarefa', 'lembrete')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'cancelled')),
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_calendar_events_valid_range check (ends_at > starts_at)
);

create index if not exists personal_calendar_events_user_start_idx
  on public.personal_calendar_events (user_id, starts_at);

create index if not exists personal_calendar_events_project_idx
  on public.personal_calendar_events (project_id)
  where project_id is not null;

alter table public.personal_calendar_events enable row level security;

grant select, insert, update, delete on public.personal_calendar_events to authenticated;

drop policy if exists personal_calendar_events_select_own on public.personal_calendar_events;
create policy personal_calendar_events_select_own
  on public.personal_calendar_events for select to authenticated
  using (user_id = auth.uid());

drop policy if exists personal_calendar_events_insert_own on public.personal_calendar_events;
create policy personal_calendar_events_insert_own
  on public.personal_calendar_events for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists personal_calendar_events_update_own on public.personal_calendar_events;
create policy personal_calendar_events_update_own
  on public.personal_calendar_events for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists personal_calendar_events_delete_own on public.personal_calendar_events;
create policy personal_calendar_events_delete_own
  on public.personal_calendar_events for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.set_personal_calendar_event_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personal_calendar_events_updated_at on public.personal_calendar_events;
create trigger personal_calendar_events_updated_at
before update on public.personal_calendar_events
for each row execute function public.set_personal_calendar_event_updated_at();
