-- IMPLANTA: políticas de acesso para os cinco perfis.
-- Não remove dados. Apenas substitui políticas de autorização existentes.

CREATE OR REPLACE FUNCTION public.can_access_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'comercial')
      OR EXISTS (
        SELECT 1
        FROM public.project_analysts pa
        JOIN public.profiles pr ON pr.id = pa.profile_id
        WHERE pa.project_id = _project_id
          AND lower(coalesce(pr.email, '')) =
              lower(coalesce((SELECT email FROM auth.users WHERE id = auth.uid()), ''))
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = _project_id
          AND (
            p.created_by = auth.uid()
            OR lower(coalesce(p.email_cliente, '')) = lower(coalesce((SELECT email FROM auth.users WHERE id = auth.uid()), ''))
          )
      )
$$;

DROP POLICY IF EXISTS clients_insert_authenticated ON public.clients;
DROP POLICY IF EXISTS clients_update_authenticated ON public.clients;
CREATE POLICY clients_insert_admin_or_comercial ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'comercial'));
CREATE POLICY clients_update_admin_or_comercial ON public.clients
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(), 'comercial'))
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'comercial'));

DROP POLICY IF EXISTS products_write_admin ON public.products;
CREATE POLICY products_write_admin ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS projects_insert ON public.projects;
DROP POLICY IF EXISTS projects_update ON public.projects;
DROP POLICY IF EXISTS projects_delete_admin ON public.projects;
CREATE POLICY projects_insert_admin_or_analista ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'analista'));
CREATE POLICY projects_update_admin_or_analista ON public.projects
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.has_role(auth.uid(), 'analista')
      AND public.can_access_project(id)
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.has_role(auth.uid(), 'analista')
      AND public.can_access_project(id)
    )
  );
CREATE POLICY projects_delete_admin ON public.projects
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS stages_access ON public.project_stages;
CREATE POLICY stages_read ON public.project_stages
  FOR SELECT TO authenticated USING (public.can_access_project(project_id));
CREATE POLICY stages_write_admin_or_analista ON public.project_stages
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));
CREATE POLICY stages_update_admin_or_analista ON public.project_stages
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)))
  WITH CHECK (public.is_admin() OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));
CREATE POLICY stages_delete_admin_or_analista ON public.project_stages
  FOR DELETE TO authenticated
  USING (public.is_admin() OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));

DROP POLICY IF EXISTS modules_access ON public.modules;
CREATE POLICY modules_read ON public.modules
  FOR SELECT TO authenticated USING (public.can_access_project(project_id));
CREATE POLICY modules_write_admin_or_analista ON public.modules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));
CREATE POLICY modules_update_admin_or_analista ON public.modules
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)))
  WITH CHECK (public.is_admin() OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));
CREATE POLICY modules_delete_admin_or_analista ON public.modules
  FOR DELETE TO authenticated
  USING (public.is_admin() OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));

DROP POLICY IF EXISTS logs_access ON public.log_entries;
CREATE POLICY logs_read ON public.log_entries
  FOR SELECT TO authenticated USING (public.can_access_project(project_id));
CREATE POLICY logs_write_admin_or_analista ON public.log_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));
CREATE POLICY logs_update_admin_or_analista ON public.log_entries
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)))
  WITH CHECK (public.is_admin() OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));
CREATE POLICY logs_delete_admin_or_analista ON public.log_entries
  FOR DELETE TO authenticated
  USING (public.is_admin() OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));

DROP POLICY IF EXISTS project_documents_insert ON public.project_documents;
DROP POLICY IF EXISTS project_documents_update ON public.project_documents;
DROP POLICY IF EXISTS project_documents_delete ON public.project_documents;
CREATE POLICY project_documents_insert ON public.project_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_project(project_id)
    AND (
      public.is_admin()
      OR public.has_role(auth.uid(), 'analista')
      OR public.has_role(auth.uid(), 'comercial')
    )
  );
CREATE POLICY project_documents_update ON public.project_documents
  FOR UPDATE TO authenticated
  USING (
    public.can_access_project(project_id)
    AND (
      public.is_admin()
      OR public.has_role(auth.uid(), 'analista')
      OR public.has_role(auth.uid(), 'comercial')
    )
  )
  WITH CHECK (
    public.can_access_project(project_id)
    AND (
      public.is_admin()
      OR public.has_role(auth.uid(), 'analista')
      OR public.has_role(auth.uid(), 'comercial')
    )
  );
CREATE POLICY project_documents_delete ON public.project_documents
  FOR DELETE TO authenticated
  USING (
    public.can_access_project(project_id)
    AND (public.is_admin() OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'comercial'))
  );

DROP POLICY IF EXISTS project_emails_insert ON public.project_emails;
CREATE POLICY project_emails_insert ON public.project_emails
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_project(project_id)
    AND (public.is_admin() OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'comercial'))
  );
