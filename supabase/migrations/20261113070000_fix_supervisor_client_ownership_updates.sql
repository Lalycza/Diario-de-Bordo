-- Permite que o Supervisor edite clientes que ele próprio cadastrou,
-- mesmo antes de existir contrato ativo ou concessão de acesso à área.
-- Mantém as regras existentes para Admin, Supervisor com acesso concedido,
-- Comercial e Analista proprietário do cadastro/carteira.

drop policy if exists clients_update_admin_supervisor_comercial_or_analyst_own
  on public.clients;

create policy clients_update_admin_supervisor_comercial_or_analyst_own
  on public.clients
  for update
  to authenticated
  using (
    public.is_central_admin()
    or (
      public.has_role((select auth.uid()), 'supervisor'::public.app_role)
      and public.can_access_client_area(id, public.current_business_unit())
    )
    or (
      public.has_role((select auth.uid()), 'supervisor'::public.app_role)
      and created_by = (select auth.uid())
      and public.current_business_unit() in ('sistemas', 'infra')
    )
    or (
      public.has_role((select auth.uid()), 'comercial'::public.app_role)
      and public.current_business_unit() = 'sistemas'
      and public.can_access_client_area(id, 'sistemas')
    )
    or (
      public.has_role((select auth.uid()), 'analista'::public.app_role)
      and (
        created_by = (select auth.uid())
        or exists (
          select 1
          from public.projects p
          left join public.project_analysts pa on pa.project_id = p.id
          where p.client_id = clients.id
            and p.business_unit = public.current_business_unit()
            and (
              p.owner_id = (select auth.uid())
              or pa.profile_id = (select auth.uid())
            )
        )
      )
    )
  )
  with check (
    public.is_central_admin()
    or (
      public.has_role((select auth.uid()), 'supervisor'::public.app_role)
      and public.can_access_client_area(id, public.current_business_unit())
    )
    or (
      public.has_role((select auth.uid()), 'supervisor'::public.app_role)
      and created_by = (select auth.uid())
      and public.current_business_unit() in ('sistemas', 'infra')
    )
    or (
      public.has_role((select auth.uid()), 'comercial'::public.app_role)
      and public.current_business_unit() = 'sistemas'
      and public.can_access_client_area(id, 'sistemas')
    )
    or (
      public.has_role((select auth.uid()), 'analista'::public.app_role)
      and (
        created_by = (select auth.uid())
        or exists (
          select 1
          from public.projects p
          left join public.project_analysts pa on pa.project_id = p.id
          where p.client_id = clients.id
            and p.business_unit = public.current_business_unit()
            and (
              p.owner_id = (select auth.uid())
              or pa.profile_id = (select auth.uid())
            )
        )
      )
    )
  );
