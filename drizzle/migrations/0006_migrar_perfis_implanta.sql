-- IMPLANTA: migration segura dos perfis de usuário.
-- Não remove dados nem altera usuários existentes.
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analista';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'comercial';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cliente';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Garante que o administrador existente continue com perfil admin.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('larissazonetti@outlook.com')
ON CONFLICT (user_id, role) DO NOTHING;
