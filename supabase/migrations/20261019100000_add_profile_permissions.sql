-- Permissões individuais opcionais: chave ausente mantém o padrão do perfil.
create table if not exists public.profile_permissions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  permissions jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint profile_permissions_object check (jsonb_typeof(permissions) = 'object')
);

alter table public.profile_permissions enable row level security;

drop policy if exists profile_permissions_read_self_or_admin on public.profile_permissions;
create policy profile_permissions_read_self_or_admin
  on public.profile_permissions
  for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists profile_permissions_manage_admin on public.profile_permissions;
create policy profile_permissions_manage_admin
  on public.profile_permissions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.protect_implanta_superadmin_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  protected_email text;
begin
  select lower(coalesce(email,'')) into protected_email
  from public.profiles where id = new.user_id;

  if new.user_id = '883addca-422c-4266-955e-823df31ec404'::uuid
     or protected_email = lower('larissazonetti@outlook.com') then
    raise exception 'O Administrador principal não pode receber permissões individuais.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_implanta_superadmin_permissions() from public;
drop trigger if exists protect_implanta_superadmin_permissions on public.profile_permissions;
create trigger protect_implanta_superadmin_permissions
  before insert or update on public.profile_permissions
  for each row execute function public.protect_implanta_superadmin_permissions();

comment on table public.profile_permissions is
  'Overrides de acesso por usuário. Chaves ausentes mantêm as permissões padrão do perfil.';
