-- Corrige autorização de criação de projetos para o perfil Admin protegido
-- e habilita identificação fiscal de clientes internacionais sem CNPJ.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS foreign_tax_id text;

DROP POLICY IF EXISTS projects_insert_admin_supervisor_or_analista ON public.projects;
CREATE POLICY projects_insert_admin_supervisor_or_analista
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR (
    business_unit = public.current_business_unit()
    AND public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
  )
  OR (
    business_unit = public.current_business_unit()
    AND public.has_role((SELECT auth.uid()), 'analista'::public.app_role)
    AND created_by = (SELECT auth.uid())
  )
);
