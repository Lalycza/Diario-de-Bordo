-- Vincula cada projeto ao produto do catálogo.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id);

CREATE INDEX IF NOT EXISTS projects_product_id_idx
  ON public.projects(product_id);

-- project_modules já usa (project_id, module_id) como chave primária.
-- O catálogo de módulos permanece compartilhado entre produtos e projetos.
