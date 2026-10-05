-- CS pode consultar todos os projetos, sem ganhar permissões de escrita.
create or replace function public.can_access_project(_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select
    public.is_admin()
    or public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'supervisor')
    or public.has_role(auth.uid(), 'cs')
    or public.has_role(auth.uid(), 'operador')
    or (
      public.has_role(auth.uid(), 'analista')
      and exists (
        select 1
        from public.project_analysts pa
        join public.profiles pr on pr.id = pa.profile_id
        where pa.project_id = _project_id
          and lower(coalesce(pr.email,'')) =
              lower(coalesce((select email from auth.users where id = auth.uid()),''))
      )
    )
    or (
      public.has_role(auth.uid(), 'cliente')
      and exists (
        select 1
        from public.projects p
        join public.profiles pr on pr.id = auth.uid()
        where p.id = _project_id
          and p.client_id = pr.client_id
      )
    )
    or exists (
      select 1 from public.projects p
      where p.id = _project_id and p.created_by = auth.uid()
    );
$function$;