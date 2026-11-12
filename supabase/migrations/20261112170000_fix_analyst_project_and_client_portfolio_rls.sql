-- Project creators must be able to read the row returned by INSERT ... RETURNING
-- before project_analysts is populated. Keep visibility scoped to their own area.
drop policy if exists projects_select on public.projects;
create policy projects_select
on public.projects
for select
to authenticated
using (
  public.can_access_project(id)
  or (
    created_by = (select auth.uid())
    and business_unit = public.current_business_unit()
  )
);

-- Analysts may manage product/contract links for clients they created in their
-- own business unit, allowing them to build their own portfolio before a project.
create or replace function public.can_manage_client_area(_client_id uuid, _business_unit text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select
    auth.uid() is not null
    and (
      public.is_central_admin()
      or exists (
        select 1
        from public.profiles p
        join public.clients c on c.id = _client_id
        where p.id = (select auth.uid())
          and p.active = true
          and p.business_unit = _business_unit
          and (
            public.has_role((select auth.uid()),'supervisor'::public.app_role)
            or (_business_unit='sistemas' and public.has_role((select auth.uid()),'comercial'::public.app_role))
            or (
              public.has_role((select auth.uid()),'analista'::public.app_role)
              and (
                c.created_by = (select auth.uid())
                or exists (
                  select 1
                  from public.projects pr
                  left join public.project_analysts pa on pa.project_id=pr.id
                  where pr.client_id=_client_id
                    and pr.business_unit=_business_unit
                    and (pr.owner_id=(select auth.uid()) or pa.profile_id=(select auth.uid()))
                )
              )
            )
          )
      )
    );
$function$;

drop policy if exists client_service_contracts_area_manager_all on public.client_service_contracts;
create policy client_service_contracts_area_manager_all
on public.client_service_contracts
for all
to authenticated
using (
  public.can_manage_business_unit(business_unit)
  or (
    public.has_role((select auth.uid()),'analista'::public.app_role)
    and business_unit=public.current_business_unit()
    and exists (
      select 1 from public.clients c
      where c.id=client_service_contracts.client_id
        and c.created_by=(select auth.uid())
    )
  )
)
with check (
  public.can_manage_business_unit(business_unit)
  or (
    public.has_role((select auth.uid()),'analista'::public.app_role)
    and business_unit=public.current_business_unit()
    and created_by=(select auth.uid())
    and exists (
      select 1 from public.clients c
      where c.id=client_service_contracts.client_id
        and c.created_by=(select auth.uid())
    )
  )
);
