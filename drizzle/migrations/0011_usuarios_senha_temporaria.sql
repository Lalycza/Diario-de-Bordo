-- IMPLANTA: força troca da senha no primeiro acesso/redefinição pelo Supervisor.
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

create index if not exists profiles_must_change_password_idx
  on public.profiles(must_change_password)
  where must_change_password = true;
