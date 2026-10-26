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

create index if not exists personal_calendar_events_user_starts_idx
  on public.personal_calendar_events (user_id, starts_at);

alter table public.personal_calendar_events enable row level security;

drop policy if exists "Users can read own calendar events" on public.personal_calendar_events;
create policy "Users can read own calendar events"
  on public.personal_calendar_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own calendar events" on public.personal_calendar_events;
create policy "Users can create own calendar events"
  on public.personal_calendar_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own calendar events" on public.personal_calendar_events;
create policy "Users can update own calendar events"
  on public.personal_calendar_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own calendar events" on public.personal_calendar_events;
create policy "Users can delete own calendar events"
  on public.personal_calendar_events for delete
  using (auth.uid() = user_id);

create or replace function public.set_personal_calendar_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personal_calendar_events_updated_at on public.personal_calendar_events;
create trigger personal_calendar_events_updated_at
  before update on public.personal_calendar_events
  for each row execute function public.set_personal_calendar_events_updated_at();
