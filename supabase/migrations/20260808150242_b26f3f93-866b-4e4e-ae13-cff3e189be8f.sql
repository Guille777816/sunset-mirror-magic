-- 1) has_role: SECURITY DEFINER -> SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT SELECT ON public.user_roles TO anon;

-- 2) Storage: remove broad public listing policies (public buckets still serve files via CDN)
DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read site-assets" ON storage.objects;

CREATE POLICY "Admins can list product-images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can list site-assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));

-- 3) orders INSERT policy: replace WITH CHECK (true) with validated constraints
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

CREATE POLICY "Anyone can create valid orders"
ON public.orders FOR INSERT TO anon, authenticated
WITH CHECK (
  length(btrim(customer_name)) BETWEEN 2 AND 120
  AND length(btrim(customer_phone)) BETWEEN 5 AND 40
  AND jsonb_typeof(items) = 'array'
  AND jsonb_array_length(items) BETWEEN 1 AND 50
  AND status = 'pendiente'
  AND mp_payment_id IS NULL
  AND mp_status IS NULL
);