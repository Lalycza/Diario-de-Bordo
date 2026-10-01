-- Corrige campos do cadastro de clientes usados pela tela atual.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS atividade_principal text;

-- Mantém acesso explícito para a aplicação autenticada.
GRANT SELECT, INSERT, UPDATE ON public.clients TO authenticated;
