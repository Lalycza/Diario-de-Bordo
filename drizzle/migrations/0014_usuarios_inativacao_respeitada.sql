-- IMPLANTA: usuários inativos deixam de possuir permissões de aplicação.
-- O cadastro permanece preservado; apenas o acesso fica bloqueado.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND p.active = true
  );
$function$;
