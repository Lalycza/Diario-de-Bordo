-- Corrige RLS do Storage para documentos de clientes e projetos.
-- Mantém compatibilidade com arquivos antigos em project-documents.
-- A aplicação destas políticas é idempotente.

drop policy if exists client_documents_storage_insert on storage.objects;
create policy client_documents_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'client-documents'
  and (
    is_admin()
    or has_role(auth.uid(), 'supervisor'::app_role)
    or has_role(auth.uid(), 'comercial'::app_role)
    or (
      has_role(auth.uid(), 'analista'::app_role)
      and exists (
        select 1 from projects p
        join project_analysts pa on pa.project_id = p.id
        where p.client_id = (storage.foldername(objects.name))[2]::uuid
          and pa.profile_id = auth.uid()
      )
    )
  )
);

drop policy if exists client_documents_storage_delete on storage.objects;
create policy client_documents_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'client-documents'
  and (
    is_admin()
    or has_role(auth.uid(), 'supervisor'::app_role)
    or has_role(auth.uid(), 'comercial'::app_role)
    or (
      has_role(auth.uid(), 'analista'::app_role)
      and exists (
        select 1 from projects p
        join project_analysts pa on pa.project_id = p.id
        where p.client_id = (storage.foldername(objects.name))[2]::uuid
          and pa.profile_id = auth.uid()
      )
    )
  )
);

drop policy if exists project_docs_insert on storage.objects;
create policy project_docs_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-documents'
  and can_access_project((
    case when (storage.foldername(name))[1] = 'projects'
      then (storage.foldername(name))[2]
      else (storage.foldername(name))[1]
    end
  )::uuid)
  and (
    is_admin() or has_role(auth.uid(), 'supervisor'::app_role)
    or has_role(auth.uid(), 'analista'::app_role)
  )
);

drop policy if exists project_docs_delete on storage.objects;
create policy project_docs_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-documents'
  and can_access_project((
    case when (storage.foldername(name))[1] = 'projects'
      then (storage.foldername(name))[2]
      else (storage.foldername(name))[1]
    end
  )::uuid)
  and (
    is_admin() or has_role(auth.uid(), 'supervisor'::app_role)
    or has_role(auth.uid(), 'analista'::app_role)
  )
);

drop policy if exists project_docs_select on storage.objects;
create policy project_docs_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-documents'
  and can_access_project((
    case when (storage.foldername(name))[1] = 'projects'
      then (storage.foldername(name))[2]
      else (storage.foldername(name))[1]
    end
  )::uuid)
);

drop policy if exists project_docs_update on storage.objects;
create policy project_docs_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'project-documents'
  and can_access_project((
    case when (storage.foldername(name))[1] = 'projects'
      then (storage.foldername(name))[2]
      else (storage.foldername(name))[1]
    end
  )::uuid)
  and (
    is_admin() or has_role(auth.uid(), 'supervisor'::app_role)
    or has_role(auth.uid(), 'analista'::app_role)
  )
)
with check (
  bucket_id = 'project-documents'
  and can_access_project((
    case when (storage.foldername(name))[1] = 'projects'
      then (storage.foldername(name))[2]
      else (storage.foldername(name))[1]
    end
  )::uuid)
  and (
    is_admin() or has_role(auth.uid(), 'supervisor'::app_role)
    or has_role(auth.uid(), 'analista'::app_role)
  )
);