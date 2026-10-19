-- Per-project client contacts and email recipients.
-- A client may have multiple parallel projects with different responsible contacts.
CREATE TABLE IF NOT EXISTS public.project_client_contacts (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_contact_id uuid NOT NULL REFERENCES public.client_contacts(id) ON DELETE CASCADE,
  is_responsible boolean NOT NULL DEFAULT false,
  receives_emails boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, client_contact_id)
);

CREATE INDEX IF NOT EXISTS idx_project_client_contacts_contact
  ON public.project_client_contacts (client_contact_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_project_client_contacts_one_responsible
  ON public.project_client_contacts (project_id)
  WHERE is_responsible = true;

ALTER TABLE public.project_client_contacts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_client_contacts TO authenticated;

DROP POLICY IF EXISTS project_client_contacts_select ON public.project_client_contacts;
CREATE POLICY project_client_contacts_select
ON public.project_client_contacts
FOR SELECT TO authenticated
USING (can_access_project(project_id));

DROP POLICY IF EXISTS project_client_contacts_manage ON public.project_client_contacts;
CREATE POLICY project_client_contacts_manage
ON public.project_client_contacts
FOR ALL TO authenticated
USING (
  can_access_project(project_id)
  AND (
    is_admin()
    OR has_role(auth.uid(), 'supervisor'::app_role)
    OR has_role(auth.uid(), 'analista'::app_role)
  )
)
WITH CHECK (
  can_access_project(project_id)
  AND (
    is_admin()
    OR has_role(auth.uid(), 'supervisor'::app_role)
    OR has_role(auth.uid(), 'analista'::app_role)
  )
);

-- Preserve existing email behavior initially: each existing project inherits
-- the client's contacts, then can be customized independently per project.
WITH ranked AS (
  SELECT p.id AS project_id, cc.id AS client_contact_id,
         row_number() OVER (
           PARTITION BY p.id
           ORDER BY cc.is_project_responsible DESC, cc.created_at ASC, cc.id
         ) AS rn,
         cc.is_project_responsible
  FROM public.projects p
  JOIN public.client_contacts cc ON cc.client_id = p.client_id
)
INSERT INTO public.project_client_contacts
  (project_id, client_contact_id, is_responsible, receives_emails)
SELECT project_id, client_contact_id, (rn = 1), true
FROM ranked
ON CONFLICT (project_id, client_contact_id) DO NOTHING;
