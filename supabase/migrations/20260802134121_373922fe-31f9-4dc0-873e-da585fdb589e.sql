CREATE OR REPLACE FUNCTION public.enforce_order_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  computed numeric := 0;
BEGIN
  SELECT COALESCE(SUM(p.price_ars * GREATEST(COALESCE((it->>'qty')::int, 0), 0)), 0)
    INTO computed
  FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb)) AS it
  JOIN public.products p ON p.id = (it->>'id')::uuid
  WHERE p.is_active = true;

  NEW.total_ars := computed;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_enforce_total ON public.orders;
CREATE TRIGGER orders_enforce_total
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_total();