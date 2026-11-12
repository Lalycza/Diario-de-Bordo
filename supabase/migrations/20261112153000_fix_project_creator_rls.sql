-- Always stamp the authenticated creator from the JWT, never trust a
-- client-supplied created_by value. The projects INSERT RLS policy allows
-- analysts only when created_by = auth.uid().
do $$
declare
  v_definition text;
  v_old text := $old$v_created_by := coalesce(nullif(p_payload->>'created_by','')::uuid, auth.uid());$old$;
begin
  select pg_get_functiondef('public.create_project_atomic(jsonb,uuid,uuid,uuid[])'::regprocedure)
    into v_definition;
  if position(v_old in v_definition)=0 then
    raise exception 'Expected create_project_atomic definition was not found.';
  end if;
  v_definition := replace(v_definition, v_old, 'v_created_by := auth.uid();');
  execute v_definition;
end $$;
