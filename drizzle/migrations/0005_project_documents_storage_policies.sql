CREATE POLICY project_docs_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-documents' AND public.can_access_project(((storage.foldername(name))[1])::uuid));
CREATE POLICY project_docs_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-documents' AND public.can_access_project(((storage.foldername(name))[1])::uuid));
CREATE POLICY project_docs_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-documents' AND public.can_access_project(((storage.foldername(name))[1])::uuid));