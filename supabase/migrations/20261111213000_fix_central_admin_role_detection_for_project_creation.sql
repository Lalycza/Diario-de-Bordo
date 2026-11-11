create or replace function public.is_central_admin()
returns boolean
language sql
stable
set search_path = public
as $function$
  select public.has_role((select auth.uid()), 'admin'::public.app_role);
$function$;
