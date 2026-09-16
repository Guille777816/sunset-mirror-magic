ALTER TABLE public.products ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';

UPDATE public.products SET categories = ARRAY[category] WHERE cardinality(categories) = 0 AND category IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_product_categories()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.categories IS NULL OR cardinality(NEW.categories) = 0 THEN
    IF NEW.category IS NOT NULL THEN
      NEW.categories := ARRAY[NEW.category];
    ELSE
      RAISE EXCEPTION 'El producto debe tener al menos una categoría';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(NEW.categories) c
    WHERE c NOT IN ('autos','camionetas','camiones','agricolas','industriales')
  ) THEN
    RAISE EXCEPTION 'Categoría inválida en categories';
  END IF;

  NEW.category := NEW.categories[1];
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_product_categories_trg ON public.products;
CREATE TRIGGER validate_product_categories_trg
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.validate_product_categories();