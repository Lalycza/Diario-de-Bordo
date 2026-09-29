-- Papéis de usuário
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'operador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE POLICY user_roles_select_self_or_admin ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- Produtos (sistemas)
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_select_authenticated ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY products_write_admin ON public.products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Catálogo de módulos/submódulos por produto
CREATE TABLE IF NOT EXISTS public.product_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.product_modules(id) ON DELETE CASCADE,
  nome text NOT NULL,
  grupo text,
  area text,
  responsavel text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_modules_product_idx ON public.product_modules(product_id, ordem);
CREATE INDEX IF NOT EXISTS product_modules_parent_idx ON public.product_modules(parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_modules TO authenticated;
GRANT ALL ON public.product_modules TO service_role;
ALTER TABLE public.product_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_modules_select_authenticated ON public.product_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY product_modules_write_admin ON public.product_modules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER product_modules_touch BEFORE UPDATE ON public.product_modules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Clientes
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text,
  razao_social text NOT NULL,
  nome_fantasia text,
  email text,
  telefone text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  municipio text,
  uf text,
  cep text,
  situacao_cadastral text,
  atividade_principal text,
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS clients_cnpj_key ON public.clients(cnpj) WHERE cnpj IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY clients_select_authenticated ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY clients_insert_authenticated ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY clients_update_authenticated ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY clients_delete_admin ON public.clients FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER clients_touch BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Vínculos no projeto
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

CREATE TABLE IF NOT EXISTS public.project_analysts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS project_analysts_user_idx ON public.project_analysts(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_analysts TO authenticated;
GRANT ALL ON public.project_analysts TO service_role;
ALTER TABLE public.project_analysts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_project(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
     OR EXISTS (SELECT 1 FROM public.project_analysts pa WHERE pa.project_id = _project_id AND pa.user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.created_by = auth.uid())
$$;

CREATE POLICY project_analysts_select ON public.project_analysts
  FOR SELECT TO authenticated USING (public.can_access_project(project_id));
CREATE POLICY project_analysts_write_admin ON public.project_analysts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Documentos do projeto
CREATE TABLE IF NOT EXISTS public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  storage_path text NOT NULL,
  mime_type text,
  tamanho bigint,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_documents_project_idx ON public.project_documents(project_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_documents TO authenticated;
GRANT ALL ON public.project_documents TO service_role;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_documents_select ON public.project_documents
  FOR SELECT TO authenticated USING (public.can_access_project(project_id));
CREATE POLICY project_documents_insert ON public.project_documents
  FOR INSERT TO authenticated WITH CHECK (public.can_access_project(project_id));
CREATE POLICY project_documents_update ON public.project_documents
  FOR UPDATE TO authenticated USING (public.can_access_project(project_id));
CREATE POLICY project_documents_delete ON public.project_documents
  FOR DELETE TO authenticated USING (public.can_access_project(project_id));

-- Registro de e-mails enviados
CREATE TABLE IF NOT EXISTS public.project_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id),
  destinatario text NOT NULL,
  assunto text,
  tipo text,
  conteudo text,
  status text NOT NULL DEFAULT 'registrado',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_emails_project_idx ON public.project_emails(project_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_emails TO authenticated;
GRANT ALL ON public.project_emails TO service_role;
ALTER TABLE public.project_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_emails_select ON public.project_emails
  FOR SELECT TO authenticated USING (public.can_access_project(project_id));
CREATE POLICY project_emails_insert ON public.project_emails
  FOR INSERT TO authenticated WITH CHECK (public.can_access_project(project_id));

-- Substitui políticas abertas por políticas por papel
DROP POLICY IF EXISTS projects_all_authenticated ON public.projects;
CREATE POLICY projects_select ON public.projects FOR SELECT TO authenticated USING (public.can_access_project(id));
CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR public.is_admin());
CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING (public.can_access_project(id));
CREATE POLICY projects_delete_admin ON public.projects FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS stages_all_authenticated ON public.project_stages;
CREATE POLICY stages_access ON public.project_stages FOR ALL TO authenticated
  USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));

DROP POLICY IF EXISTS modules_all_authenticated ON public.modules;
CREATE POLICY modules_access ON public.modules FOR ALL TO authenticated
  USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));

DROP POLICY IF EXISTS logs_all_authenticated ON public.log_entries;
CREATE POLICY logs_access ON public.log_entries FOR ALL TO authenticated
  USING (public.can_access_project(project_id)) WITH CHECK (public.can_access_project(project_id));

-- Todo novo usuário nasce como operador
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operador')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();