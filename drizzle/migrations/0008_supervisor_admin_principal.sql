-- IMPLANTA: adicionar perfil Supervisor.
-- O Administrador principal é a conta larissazonetti@outlook.com.
--
-- Esta migration altera apenas o enum. A atribuição do Administrador principal
-- fica na migration 0009 para que o novo valor do enum já esteja confirmado
-- antes de ser utilizado.

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
