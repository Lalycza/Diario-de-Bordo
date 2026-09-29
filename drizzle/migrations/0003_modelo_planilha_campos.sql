ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS grupo text;
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS analista text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS coordenacao text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS data_entrega_original date;
ALTER TABLE public.project_stages ADD COLUMN IF NOT EXISTS responsavel_tipo text;
ALTER TABLE public.log_entries ADD COLUMN IF NOT EXISTS analista text;
ALTER TABLE public.log_entries ADD COLUMN IF NOT EXISTS pauta_dia text;
CREATE INDEX IF NOT EXISTS modules_ordem_idx ON public.modules (project_id, ordem);