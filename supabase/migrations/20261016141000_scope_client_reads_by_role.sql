-- Operators remain read-only across clients; client users only see their own client.
DROP POLICY IF EXISTS "Authenticated users can read client products" ON public.client_products;
CREATE POLICY client_products_read_scoped ON public.client_products
FOR SELECT TO authenticated
USING (
  is_admin() OR has_role(auth.uid(), 'supervisor'::app_role)
  OR has_role(auth.uid(), 'comercial'::app_role)
  OR has_role(auth.uid(), 'operador'::app_role)
  OR (
    has_role(auth.uid(), 'analista'::app_role)
    AND (
      EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_products.client_id AND c.created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.projects p WHERE p.client_id = client_products.client_id AND can_access_project(p.id))
    )
  )
  OR (
    has_role(auth.uid(), 'cliente'::app_role)
    AND client_products.client_id = (SELECT pr.client_id FROM public.profiles pr WHERE pr.id = auth.uid())
  )
);
DROP POLICY IF EXISTS client_contacts_select ON public.client_contacts;
CREATE POLICY client_contacts_select ON public.client_contacts
FOR SELECT TO authenticated
USING (
  is_admin() OR has_role(auth.uid(), 'supervisor'::app_role)
  OR has_role(auth.uid(), 'comercial'::app_role)
  OR has_role(auth.uid(), 'operador'::app_role)
  OR (
    has_role(auth.uid(), 'analista'::app_role)
    AND (
      EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_contacts.client_id AND c.created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.projects p WHERE p.client_id = client_contacts.client_id AND can_access_project(p.id))
    )
  )
  OR (
    has_role(auth.uid(), 'cliente'::app_role)
    AND client_contacts.client_id = (SELECT pr.client_id FROM public.profiles pr WHERE pr.id = auth.uid())
  )
);
DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select ON public.clients
FOR SELECT TO authenticated
USING (
  is_admin() OR has_role(auth.uid(), 'supervisor'::app_role)
  OR has_role(auth.uid(), 'comercial'::app_role)
  OR has_role(auth.uid(), 'operador'::app_role)
  OR (
    has_role(auth.uid(), 'analista'::app_role)
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.projects p WHERE p.client_id = clients.id AND can_access_project(p.id))
    )
  )
  OR (
    has_role(auth.uid(), 'cliente'::app_role)
    AND id = (SELECT pr.client_id FROM public.profiles pr WHERE pr.id = auth.uid())
  )
);