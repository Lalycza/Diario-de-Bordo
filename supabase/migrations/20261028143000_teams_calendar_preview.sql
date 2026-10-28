-- Microsoft 365 calendar connection metadata and imported events.
-- Deliberately isolated from production; apply to diario-de-bordo-testes first.
create table if not exists public.teams_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  microsoft_user_id text not null,
  microsoft_email text,
  refresh_token_ciphertext text not null,
  refresh_token_iv text not null,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  delta_link text
);
alter table public.teams_calendar_connections enable row level security;
revoke all on public.teams_calendar_connections from anon, authenticated;
grant all on public.teams_calendar_connections to service_role;

create table if not exists public.teams_calendar_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_verifier text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.teams_calendar_oauth_states enable row level security;
revoke all on public.teams_calendar_oauth_states from anon, authenticated;
grant all on public.teams_calendar_oauth_states to service_role;

create table if not exists public.teams_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  graph_event_id text not null,
  subject text not null default '(Sem título)',
  body_preview text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_all_day boolean not null default false,
  show_as text,
  web_link text,
  last_modified_at timestamptz,
  is_cancelled boolean not null default false,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, graph_event_id)
);
alter table public.teams_calendar_events enable row level security;
revoke all on public.teams_calendar_events from anon;
grant select on public.teams_calendar_events to authenticated;
grant all on public.teams_calendar_events to service_role;
drop policy if exists "Users read own Teams calendar events" on public.teams_calendar_events;
create policy "Users read own Teams calendar events"
  on public.teams_calendar_events for select to authenticated
  using (auth.uid() = user_id);
create index if not exists teams_calendar_events_user_starts_idx
  on public.teams_calendar_events(user_id, starts_at);
