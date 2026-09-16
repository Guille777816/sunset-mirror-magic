CREATE OR REPLACE FUNCTION public.validate_product_categories()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY['autos','camionetas','suv','camiones','agricolas','industriales'];
BEGIN
  IF NEW.categories IS NULL OR array_length(NEW.categories, 1) IS NULL THEN
    NEW.categories := ARRAY[NEW.category];
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(NEW.categories) c WHERE NOT (c = ANY(allowed))) THEN
    RAISE EXCEPTION 'Categoría inválida en categories';
  END IF;
  NEW.category := NEW.categories[1];
  RETURN NEW;
END;
$$;