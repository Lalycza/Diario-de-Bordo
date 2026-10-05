alter table public.client_products
  add column if not exists analyst_id uuid null references public.profiles(id);

create index if not exists client_products_analyst_id_idx
  on public.client_products(analyst_id);
