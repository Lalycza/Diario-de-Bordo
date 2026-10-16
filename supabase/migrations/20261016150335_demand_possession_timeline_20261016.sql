-- Track each demand's current and previous ownership periods.
CREATE TABLE IF NOT EXISTS public.demand_possession_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  responsible_person text,
  sector text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  changed_by uuid
);

CREATE INDEX IF NOT EXISTS demand_possession_history_demand_started_idx
  ON public.demand_possession_history (demand_id, started_at DESC);

ALTER TABLE public.demand_possession_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demand_possession_history_select ON public.demand_possession_history;
CREATE POLICY demand_possession_history_select
  ON public.demand_possession_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_possession_history.demand_id
        AND public.can_access_project(d.project_id)
    )
  );

CREATE OR REPLACE FUNCTION public.track_demand_possession()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.demand_possession_history
      (demand_id, responsible_person, sector, started_at, changed_by)
    VALUES
      (NEW.id, NEW.responsible_person, NEW.sector, COALESCE(NEW.created_at, now()), COALESCE(auth.uid(), NEW.created_by));
    RETURN NEW;
  END IF;

  IF NEW.responsible_person IS DISTINCT FROM OLD.responsible_person
     OR NEW.sector IS DISTINCT FROM OLD.sector THEN
    UPDATE public.demand_possession_history
       SET ended_at = now()
     WHERE demand_id = NEW.id AND ended_at IS NULL;

    INSERT INTO public.demand_possession_history
      (demand_id, responsible_person, sector, started_at, changed_by)
    VALUES
      (NEW.id, NEW.responsible_person, NEW.sector, now(), auth.uid());
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS demands_track_possession ON public.demands;
CREATE TRIGGER demands_track_possession
AFTER INSERT OR UPDATE OF responsible_person, sector
ON public.demands
FOR EACH ROW
EXECUTE FUNCTION public.track_demand_possession();

INSERT INTO public.demand_possession_history
  (demand_id, responsible_person, sector, started_at, changed_by)
SELECT d.id, d.responsible_person, d.sector, d.created_at, d.created_by
FROM public.demands d
WHERE NOT EXISTS (
  SELECT 1 FROM public.demand_possession_history h WHERE h.demand_id = d.id
);
