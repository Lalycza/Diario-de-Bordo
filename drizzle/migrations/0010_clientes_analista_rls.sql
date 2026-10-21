-- Permissões de clientes alinhadas ao perfil Analista definido no IMPLANTA.
-- Analistas podem cadastrar novos clientes e editar apenas clientes vinculados
-- a projetos aos quais têm acesso. Exclusão continua restrita ao administrador.
DROP POLICY IF EXISTS clients_insert_admin_supervisor_or_comercial ON public.clients;
CREATE POLICY clients_insert_admin_supervisor_comercial_or_analista ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'comercial')
    OR public.has_role(auth.uid(), 'analista')
  );

DROP POLICY IF EXISTS clients_update_admin_supervisor_or_comercial ON public.clients;
CREATE POLICY clients_update_admin_supervisor_comercial_or_assigned_analista ON public.clients
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'comercial')
    OR (
      public.has_role(auth.uid(), 'analista')
      AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.client_id = clients.id
          AND public.can_access_project(p.id)
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'comercial')
    OR (
      public.has_role(auth.uid(), 'analista')
      AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.client_id = clients.id
          AND public.can_access_project(p.id)
      )
    )
  );
