-- Expande o catálogo da área Infra com dados próprios de produtos e serviços.
-- O catálogo de Sistemas permanece compatível e continua usando módulos/submódulos.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'Produto',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS contracted_scope text,
  ADD COLUMN IF NOT EXISTS characteristics jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deliverables jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS additional_info text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_product_type_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_product_type_check
      CHECK (product_type IN ('Produto', 'Serviço'));
  END IF;
END $$;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_characteristics_array_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_characteristics_array_check
  CHECK (jsonb_typeof(characteristics) = 'array');

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_deliverables_array_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_deliverables_array_check
  CHECK (jsonb_typeof(deliverables) = 'array');
