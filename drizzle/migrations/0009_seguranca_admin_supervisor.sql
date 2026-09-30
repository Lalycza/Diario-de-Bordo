-- IMPLANTA: segurança final dos perfis.
-- Administrador principal: garante a conta do sistema mesmo em bancos que
-- já possuíam user_roles antes desta migration.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('larissazonetti@outlook.com')
ON CONFLICT (user_id, role) DO NOTHING;


-- Administrador técnico = exclusivamente larissazonetti@outlook.com.
-- Supervisor = administrador funcional dentro do IMPLANTA, sem acesso técnico ao Supabase.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce((SELECT email FROM auth.users WHERE id = auth.uid()), '')) =
         lower('larissazonetti@outlook.com')
     AND public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.can_access_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_admin()
      OR public.has_role(auth.uid(), 'supervisor')
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
      );
$$;

DROP POLICY IF EXISTS clients_insert_admin_or_comercial ON public.clients;
DROP POLICY IF EXISTS clients_update_admin_or_comercial ON public.clients;
CREATE POLICY clients_insert_admin_supervisor_or_comercial ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'comercial'));
CREATE POLICY clients_update_admin_supervisor_or_comercial ON public.clients
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'comercial'))
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'comercial'));

DROP POLICY IF EXISTS products_write_admin ON public.products;
CREATE POLICY products_write_admin_supervisor ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'supervisor'));

DROP POLICY IF EXISTS projects_insert_admin_or_analista ON public.projects;
DROP POLICY IF EXISTS projects_update_admin_or_analista ON public.projects;
DROP POLICY IF EXISTS projects_delete_admin ON public.projects;
CREATE POLICY projects_insert_admin_supervisor_or_analista ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'analista'));
CREATE POLICY projects_update_admin_supervisor_or_analista ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(id)))
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(id)));
CREATE POLICY projects_delete_admin_or_supervisor ON public.projects
  FOR DELETE TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(), 'supervisor'));

DROP POLICY IF EXISTS stages_write_admin_or_analista ON public.project_stages;
DROP POLICY IF EXISTS stages_update_admin_or_analista ON public.project_stages;
DROP POLICY IF EXISTS stages_delete_admin_or_analista ON public.project_stages;
CREATE POLICY stages_write_admin_supervisor_or_analista ON public.project_stages
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));
CREATE POLICY stages_update_admin_supervisor_or_analista ON public.project_stages
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)))
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));
CREATE POLICY stages_delete_admin_supervisor_or_analista ON public.project_stages
  FOR DELETE TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));

DROP POLICY IF EXISTS modules_write_admin_or_analista ON public.modules;
DROP POLICY IF EXISTS modules_update_admin_or_analista ON public.modules;
DROP POLICY IF EXISTS modules_delete_admin_or_analista ON public.modules;
CREATE POLICY modules_write_admin_supervisor_or_analista ON public.modules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));
CREATE POLICY modules_update_admin_supervisor_or_analista ON public.modules
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)))
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));
CREATE POLICY modules_delete_admin_supervisor_or_analista ON public.modules
  FOR DELETE TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));

DROP POLICY IF EXISTS logs_write_admin_or_analista ON public.log_entries;
DROP POLICY IF EXISTS logs_update_admin_or_analista ON public.log_entries;
DROP POLICY IF EXISTS logs_delete_admin_or_analista ON public.log_entries;
CREATE POLICY logs_write_admin_supervisor_or_analista ON public.log_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));
CREATE POLICY logs_update_admin_supervisor_or_analista ON public.log_entries
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)))
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));
CREATE POLICY logs_delete_admin_supervisor_or_analista ON public.log_entries
  FOR DELETE TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR (public.has_role(auth.uid(), 'analista') AND public.can_access_project(project_id)));

DROP POLICY IF EXISTS project_documents_insert ON public.project_documents;
DROP POLICY IF EXISTS project_documents_update ON public.project_documents;
DROP POLICY IF EXISTS project_documents_delete ON public.project_documents;
CREATE POLICY project_documents_insert ON public.project_documents
  FOR INSERT TO authenticated
  WITH CHECK ((public.can_access_project(project_id) OR public.has_role(auth.uid(), 'comercial')) AND (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'comercial')));
CREATE POLICY project_documents_update ON public.project_documents
  FOR UPDATE TO authenticated
  USING ((public.can_access_project(project_id) OR public.has_role(auth.uid(), 'comercial')) AND (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'comercial')))
  WITH CHECK ((public.can_access_project(project_id) OR public.has_role(auth.uid(), 'comercial')) AND (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'comercial')));
CREATE POLICY project_documents_delete ON public.project_documents
  FOR DELETE TO authenticated
  USING ((public.can_access_project(project_id) OR public.has_role(auth.uid(), 'comercial')) AND (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'comercial')));

DROP POLICY IF EXISTS project_emails_insert ON public.project_emails;
CREATE POLICY project_emails_insert ON public.project_emails
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_project(project_id) AND (public.is_admin() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'analista')));


-- Comercial pode consultar/manter documentos de clientes sem ganhar acesso
-- geral aos projetos. O acesso ao bucket é limitado ao conteúdo de documentos.
CREATE POLICY project_documents_select_comercial ON public.project_documents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'comercial'));

CREATE POLICY project_docs_select_comercial ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND public.has_role(auth.uid(), 'comercial')
  );

CREATE POLICY project_docs_insert_comercial ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-documents'
    AND public.has_role(auth.uid(), 'comercial')
  );

CREATE POLICY project_docs_update_comercial ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND public.has_role(auth.uid(), 'comercial')
  )
  WITH CHECK (
    bucket_id = 'project-documents'
    AND public.has_role(auth.uid(), 'comercial')
  );

CREATE POLICY project_docs_delete_comercial ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND public.has_role(auth.uid(), 'comercial')
  );
