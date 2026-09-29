-- IMPLANTA: adicionar perfil Supervisor e proteger o Administrador principal.
-- O Administrador principal é a conta larissazonetti@outlook.com.

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Mantém o Administrador principal sempre como admin.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('larissazonetti@outlook.com')
ON CONFLICT (user_id, role) DO NOTHING;
