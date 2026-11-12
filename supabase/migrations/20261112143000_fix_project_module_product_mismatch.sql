create or replace function public.create_project_atomic(
  p_payload jsonb,
  p_product_id uuid,
  p_profile_id uuid default null,
  p_module_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  v_project_id uuid;
  v_module_id uuid;
  v_created_by uuid;
  v_business_unit text;
  v_product_business_unit text;
  v_client_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.' using errcode='42501';
  end if;

  v_created_by := coalesce(nullif(p_payload->>'created_by','')::uuid, auth.uid());
  v_client_id := nullif(p_payload->>'client_id','')::uuid;

  if p_product_id is not null then
    select pr.business_unit into v_product_business_unit
    from public.products pr
    where pr.id=p_product_id and pr.active=true;
  end if;

  v_business_unit := coalesce(nullif(p_payload->>'business_unit',''),
    v_product_business_unit,
    public.current_business_unit());

  if v_business_unit not in ('sistemas','infra') then
    raise exception 'Área do projeto inválida.' using errcode='22023';
  end if;

  if v_business_unit = 'infra' then
    p_module_ids := '{}'::uuid[];
  elsif p_product_id is not null then
    -- Módulos sempre vêm do catálogo do produto selecionado; não confiar
    -- em IDs residuais do formulário (podem pertencer a outro produto).
    select coalesce(array_agg(m.id), '{}'::uuid[])
      into p_module_ids
    from public.modules m
    where m.product_id = p_product_id and m.active = true;
  end if;

  if not public.is_central_admin()
     and v_business_unit <> public.current_business_unit() then
    raise exception 'Você só pode criar projetos na sua própria área.' using errcode='42501';
  end if;

  if v_client_id is null or not exists (
    select 1 from public.client_service_contracts sc
    where sc.client_id=v_client_id
      and sc.business_unit=v_business_unit
      and sc.contract_status in ('active','legacy')
  ) then
    raise exception 'O cliente não possui contrato/vínculo ativo para a área %.',v_business_unit using errcode='23514';
  end if;

  if p_product_id is not null then
    select pr.business_unit into v_product_business_unit
    from public.products pr
    where pr.id=p_product_id and pr.active=true;

    if v_product_business_unit is null then
      raise exception 'Produto/serviço não encontrado ou inativo.' using errcode='23503';
    end if;
    if v_product_business_unit <> v_business_unit then
      raise exception 'O produto selecionado pertence a outra área.' using errcode='23514';
    end if;
    if not exists (
      select 1 from public.client_products cp
      where cp.client_id=v_client_id and cp.product_id=p_product_id
        and cp.status <> 'suporte'
    ) then
      raise exception 'O produto/serviço precisa estar vinculado ao cliente antes de abrir o projeto.' using errcode='23514';
    end if;
  elsif v_business_unit='sistemas' then
    raise exception 'Projetos de Sistemas precisam de um produto do catálogo vinculado.' using errcode='23514';
  end if;

  if p_profile_id is not null and not exists (
    select 1 from public.profiles pr
    where pr.id=p_profile_id and pr.active=true
      and pr.role='analyst' and pr.business_unit=v_business_unit
  ) then
    raise exception 'O analista precisa estar ativo e vinculado à mesma área do projeto.' using errcode='23514';
  end if;

  insert into public.projects (
    legacy_id,name,client_id,owner_id,status,progress,
    start_date,delivery_date,original_delivery_date,base_date,
    finalized,project_type,documentation_scope,created_by,business_unit
  ) values (
    p_payload->>'legacy_id',
    coalesce(p_payload->>'name','Projeto sem nome'),
    v_client_id,
    nullif(p_payload->>'owner_id','')::uuid,
    coalesce(p_payload->>'status','Ativo'),
    coalesce((p_payload->>'progress')::numeric,0),
    nullif(p_payload->>'start_date','')::date,
    nullif(p_payload->>'delivery_date','')::date,
    nullif(p_payload->>'original_delivery_date','')::date,
    nullif(p_payload->>'base_date','')::date,
    coalesce((p_payload->>'finalized')::boolean,false),
    coalesce(p_payload->>'project_type','implantacao'),
    coalesce(p_payload->>'documentation_scope','all'),
    v_created_by,
    v_business_unit
  ) returning id into v_project_id;

  if p_product_id is not null then
    insert into public.project_products(project_id,product_id)
    values(v_project_id,p_product_id)
    on conflict(project_id,product_id) do nothing;
  end if;

  if p_profile_id is not null then
    insert into public.project_analysts(project_id,profile_id)
    values(v_project_id,p_profile_id)
    on conflict(project_id,profile_id) do nothing;
  end if;

  foreach v_module_id in array coalesce(p_module_ids,'{}'::uuid[]) loop
    insert into public.project_modules(project_id,module_id,planned_training_date)
    values(v_project_id,v_module_id,null)
    on conflict(project_id,module_id) do nothing;
  end loop;

  return v_project_id;
end;
$function$;
