-- Valores comerciais opcionais por cliente para implantação e consultoria.
-- Colunas aditivas e nullable: não alteram nem removem dados existentes.
alter table public.clients
  add column if not exists implementation_value numeric(12,2),
  add column if not exists consulting_value numeric(12,2);
