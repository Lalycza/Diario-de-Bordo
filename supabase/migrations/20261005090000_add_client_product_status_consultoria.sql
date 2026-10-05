alter table public.client_products
  add column if not exists status text not null default 'implantacao';

alter table public.client_products
  drop constraint if exists client_products_status_check;

alter table public.client_products
  add constraint client_products_status_check
  check (status in ('implantacao', 'suporte', 'consultoria'));
