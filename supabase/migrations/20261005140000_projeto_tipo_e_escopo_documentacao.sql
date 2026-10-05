ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_type text NOT NULL DEFAULT 'implantacao'
    CHECK (project_type IN ('implantacao', 'suporte', 'consultoria')),
  ADD COLUMN IF NOT EXISTS documentation_scope text NOT NULL DEFAULT 'all'
    CHECK (documentation_scope IN ('all', 'diario'));

COMMENT ON COLUMN public.projects.project_type IS 'Tipo do projeto derivado do vínculo cliente-produto: implantação, suporte ou consultoria.';
COMMENT ON COLUMN public.projects.documentation_scope IS 'Documentação habilitada para o projeto: all = Mapa/Cronograma/Diário; diario = somente Diário.';
