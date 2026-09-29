ALTER TABLE public.project_stages
  ADD COLUMN IF NOT EXISTS modulo text,
  ADD COLUMN IF NOT EXISTS pauta_semana boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_prevista_original date;

ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS data_treinamento date,
  ADD COLUMN IF NOT EXISTS homologado_por text;

CREATE INDEX IF NOT EXISTS modules_parent_id_idx ON public.modules(parent_id);
CREATE INDEX IF NOT EXISTS project_stages_modulo_idx ON public.project_stages(modulo);