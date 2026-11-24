-- IMPLANTA: correção de fases e rastreabilidade das passagens de bastão das Demandas.
-- A migração é aditiva: preserva todos os registros de posse já existentes.

ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS handoff_details text,
  ADD COLUMN IF NOT EXISTS suppress_possession_history boolean NOT NULL DEFAULT false;

ALTER TABLE public.demand_possession_history
  ADD COLUMN IF NOT EXISTS handoff_details text;

CREATE OR REPLACE FUNCTION public.track_demand_possession()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.demand_possession_history
      (demand_id, responsible_person, sector, started_at, changed_by, handoff_details)
    VALUES
      (NEW.id, NEW.responsible_person, NEW.sector,
       COALESCE(NEW.created_at, now()), COALESCE(auth.uid(), NEW.created_by), NULL);
    RETURN NEW;
  END IF;

  -- Edições corretivas de uma fase atualizam o registro de posse diretamente.
  -- Esta flag impede que a sincronização do resumo da OS gere uma nova fase.
  IF COALESCE(NEW.suppress_possession_history, false) THEN
    RETURN NEW;
  END IF;

  -- Uma nova fase só é criada quando responsável/departamento realmente mudam.
  IF NEW.responsible_person IS DISTINCT FROM OLD.responsible_person
     OR NEW.sector IS DISTINCT FROM OLD.sector THEN
    UPDATE public.demand_possession_history
       SET ended_at = now()
     WHERE demand_id = NEW.id AND ended_at IS NULL;

    INSERT INTO public.demand_possession_history
      (demand_id, responsible_person, sector, started_at, changed_by, handoff_details)
    VALUES
      (NEW.id, NEW.responsible_person, NEW.sector, now(), auth.uid(),
       NULLIF(BTRIM(NEW.handoff_details), ''));
  END IF;

  RETURN NEW;
END;
$function$;
