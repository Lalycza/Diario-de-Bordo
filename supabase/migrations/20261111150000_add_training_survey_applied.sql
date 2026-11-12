alter table public.trainings
  add column if not exists survey_applied text;

alter table public.trainings
  add constraint trainings_survey_applied_check
  check (survey_applied is null or survey_applied in ('Sim', 'Não'));
