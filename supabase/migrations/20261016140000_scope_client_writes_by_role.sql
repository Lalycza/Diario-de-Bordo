-- Scope client, contact and client-product mutations to the user's role and project assignments.
DROP POLICY IF EXISTS "Authenticated users can manage client products" ON public.client_products;
CREATE POLICY client_products_manage_scoped ON public.client_products
FOR ALL TO authenticated
USING (
  is_admin() OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'comercial'::app_role)
  OR (
    has_role(auth.uid(), 'analista'::app_role)
    AND (
      EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_products.client_id AND c.created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.projects p WHERE p.client_id = client_products.client_id AND can_access_project(p.id))
    )
  )
)
WITH CHECK (
  is_admin() OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'comercial'::app_role)
  OR (
    has_role(auth.uid(), 'analista'::app_role)
    AND (
      EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_products.client_id AND c.created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.projects p WHERE p.client_id = client_products.client_id AND can_access_project(p.id))
    )
  )
);
DROP POLICY IF EXISTS clients_insert_admin_supervisor_or_comercial ON public.clients;
CREATE POLICY clients_insert_admin_supervisor_or_comercial ON public.clients
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'comercial'::app_role)
  OR (has_role(auth.uid(), 'analista'::app_role) AND created_by = auth.uid())
);
DROP POLICY IF EXISTS clients_update_admin_supervisor_or_comercial ON public.clients;
CREATE POLICY clients_update_admin_supervisor_or_comercial ON public.clients
FOR UPDATE TO authenticated
USING (
  is_admin() OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'comercial'::app_role)
  OR (has_role(auth.uid(), 'analista'::app_role) AND (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.client_id = clients.id AND can_access_project(p.id))
  ))
)
WITH CHECK (
  is_admin() OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'comercial'::app_role)
  OR (has_role(auth.uid(), 'analista'::app_role) AND (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.client_id = clients.id AND can_access_project(p.id))
  ))
);
DROP POLICY IF EXISTS client_contacts_write ON public.client_contacts;
CREATE POLICY client_contacts_write ON public.client_contacts
FOR ALL TO authenticated
USING (
  is_admin() OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'comercial'::app_role)
  OR (has_role(auth.uid(), 'analista'::app_role) AND (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_contacts.client_id AND c.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.client_id = client_contacts.client_id AND can_access_project(p.id))
  ))
)
WITH CHECK (
  is_admin() OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'comercial'::app_role)
  OR (has_role(auth.uid(), 'analista'::app_role) AND (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_contacts.client_id AND c.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.client_id = client_contacts.client_id AND can_access_project(p.id))
  ))
);