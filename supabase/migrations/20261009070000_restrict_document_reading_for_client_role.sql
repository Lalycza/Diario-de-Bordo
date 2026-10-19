-- Restrict document reading for the Cliente role only.
-- Keep all existing write policies unchanged and keep storage buckets private.

DROP POLICY IF EXISTS client_documents_select ON public.client_documents;
CREATE POLICY client_documents_select
ON public.client_documents
FOR SELECT
TO authenticated
USING (
  NOT has_role(auth.uid(), 'cliente'::app_role)
  AND (
  is_admin()
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR has_role(auth.uid(), 'comercial'::app_role)
  OR has_role(auth.uid(), 'analista'::app_role)
  OR has_role(auth.uid(), 'operador'::app_role)
  )
);

DROP POLICY IF EXISTS project_documents_select ON public.project_documents;
CREATE POLICY project_documents_select
ON public.project_documents
FOR SELECT
TO authenticated
USING (
  can_access_project(project_id)
  AND NOT has_role(auth.uid(), 'cliente'::app_role)
);

DROP POLICY IF EXISTS client_documents_storage_select ON storage.objects;
CREATE POLICY client_documents_storage_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND auth.uid() IS NOT NULL
  AND NOT has_role(auth.uid(), 'cliente'::app_role)
);

DROP POLICY IF EXISTS project_docs_select ON storage.objects;
CREATE POLICY project_docs_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-documents'
  AND can_access_project(
    (
      CASE
        WHEN (storage.foldername(name))[1] = 'projects'
          THEN (storage.foldername(name))[2]
        ELSE (storage.foldername(name))[1]
      END
    )::uuid
  )
  AND NOT has_role(auth.uid(), 'cliente'::app_role)
);
