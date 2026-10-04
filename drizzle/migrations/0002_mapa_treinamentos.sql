ALTER TABLE public.project_stages
  ADD COLUMN IF NOT EXISTS modulo text,
  ADD COLUMN IF NOT EXISTS pauta_semana boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_prevista_original date;

ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS training_start_date date,
  ADD COLUMN IF NOT EXISTS training_completion_date date;

CREATE INDEX IF NOT EXISTS project_stages_modulo_idx ON public.project_stages(modulo);