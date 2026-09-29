-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- PROJECTS
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente TEXT NOT NULL,
  descricao TEXT,
  responsavel TEXT,
  data_inicio DATE,
  previsao_conclusao DATE,
  arquivado BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_all_authenticated" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER projects_touch BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- STAGES
CREATE TABLE public.project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  responsavel TEXT,
  data_inicio DATE,
  data_prevista DATE,
  data_conclusao DATE,
  status TEXT NOT NULL DEFAULT 'nao_iniciada',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_stages TO authenticated;
GRANT ALL ON public.project_stages TO service_role;
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stages_all_authenticated" ON public.project_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER stages_touch BEFORE UPDATE ON public.project_stages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_stages_project ON public.project_stages(project_id);

-- MODULES
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  area TEXT,
  responsavel_cliente TEXT,
  responsavel_hpro TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_homologacao DATE,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules TO authenticated;
GRANT ALL ON public.modules TO service_role;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modules_all_authenticated" ON public.modules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER modules_touch BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_modules_project ON public.modules(project_id);

-- LOG ENTRIES (diario de bordo)
CREATE TABLE public.log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  data_reuniao DATE NOT NULL,
  hora_reuniao TIME,
  participantes TEXT,
  pauta TEXT,
  tarefa_cliente TEXT,
  tarefa_hpro TEXT,
  proximo_treinamento DATE,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.log_entries TO authenticated;
GRANT ALL ON public.log_entries TO service_role;
ALTER TABLE public.log_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_all_authenticated" ON public.log_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER logs_touch BEFORE UPDATE ON public.log_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_logs_project ON public.log_entries(project_id);

-- DADOS DE EXEMPLO
INSERT INTO public.projects (id, cliente, descricao, responsavel, data_inicio, previsao_conclusao) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Clínica Vida Plena', 'Implantação completa do sistema Hpro', 'Larissa Zonetti', '2026-08-03', '2026-11-28'),
  ('22222222-2222-4222-8222-222222222222', 'Hospital São Lucas', 'Implantação dos módulos assistenciais', 'Equipe Hpro', '2026-09-01', '2027-01-30');

INSERT INTO public.project_stages (project_id, nome, descricao, responsavel, data_inicio, data_prevista, data_conclusao, status, ordem) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Kick-off', 'Reunião inicial e alinhamento de escopo', 'Larissa Zonetti', '2026-08-03', '2026-08-05', '2026-08-05', 'concluida', 1),
  ('11111111-1111-4111-8111-111111111111', 'Levantamento de processos', 'Mapeamento dos fluxos atuais do cliente', 'Equipe Hpro', '2026-08-06', '2026-08-20', '2026-08-19', 'concluida', 2),
  ('11111111-1111-4111-8111-111111111111', 'Parametrização do sistema', 'Configuração de cadastros e tabelas', 'Equipe Hpro', '2026-08-21', '2026-09-15', NULL, 'em_andamento', 3),
  ('11111111-1111-4111-8111-111111111111', 'Treinamento de usuários', 'Sessões por módulo com os times do cliente', 'Larissa Zonetti', '2026-09-16', '2026-10-20', NULL, 'nao_iniciada', 4),
  ('11111111-1111-4111-8111-111111111111', 'Go-live', 'Entrada em produção assistida', 'Equipe Hpro', '2026-11-01', '2026-11-10', NULL, 'nao_iniciada', 5),
  ('22222222-2222-4222-8222-222222222222', 'Kick-off', 'Reunião inicial com diretoria', 'Equipe Hpro', '2026-09-01', '2026-09-03', NULL, 'em_andamento', 1),
  ('22222222-2222-4222-8222-222222222222', 'Migração de dados', 'Importação da base legada', 'Equipe Hpro', '2026-09-04', '2026-09-10', NULL, 'em_risco', 2);

INSERT INTO public.modules (project_id, nome, area, responsavel_cliente, responsavel_hpro, status, data_homologacao, observacoes) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Agendamento', 'Recepção', 'Marina Alves', 'Larissa Zonetti', 'homologado', '2026-08-28', 'Homologado sem pendências'),
  ('11111111-1111-4111-8111-111111111111', 'Faturamento', 'Financeiro', 'Rogério Lima', 'Equipe Hpro', 'em_teste', NULL, 'Aguardando validação de convênios'),
  ('11111111-1111-4111-8111-111111111111', 'Prontuário Eletrônico', 'Assistencial', 'Dra. Helena Costa', 'Equipe Hpro', 'em_configuracao', NULL, 'Modelos de evolução em ajuste'),
  ('11111111-1111-4111-8111-111111111111', 'Estoque', 'Suprimentos', 'Carlos Menezes', 'Equipe Hpro', 'pendente', NULL, NULL),
  ('22222222-2222-4222-8222-222222222222', 'Internação', 'Assistencial', 'Enf. Paula Reis', 'Equipe Hpro', 'bloqueado', NULL, 'Depende da migração de dados'),
  ('22222222-2222-4222-8222-222222222222', 'Centro Cirúrgico', 'Assistencial', 'Dr. Bruno Tavares', 'Equipe Hpro', 'pendente', NULL, NULL);

INSERT INTO public.log_entries (project_id, data_reuniao, hora_reuniao, participantes, pauta, tarefa_cliente, tarefa_hpro, proximo_treinamento, observacoes) VALUES
  ('11111111-1111-4111-8111-111111111111', '2026-08-28', '14:00', 'Marina Alves, Larissa Zonetti', 'Treinamento do módulo de Agendamento', 'Cadastrar agendas dos profissionais', 'Liberar perfis de acesso da recepção', '2026-09-04', 'Equipe do cliente muito participativa'),
  ('11111111-1111-4111-8111-111111111111', '2026-09-04', '09:30', 'Rogério Lima, Equipe Hpro', 'Faturamento: tabelas de convênios', 'Enviar tabelas atualizadas dos convênios', 'Configurar regras de glosa', '2026-09-11', 'Pendência de tabela do convênio Unimed'),
  ('22222222-2222-4222-8222-222222222222', '2026-09-08', '10:00', 'Enf. Paula Reis, Equipe Hpro', 'Alinhamento inicial da internação', 'Definir responsáveis por setor', 'Preparar ambiente de teste', '2026-09-15', 'Migração de dados atrasada impacta o cronograma');
