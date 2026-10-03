-- ==============================================================================
-- LE RADIAL - SCHEMA INICIAL Y TABLAS MAESTRAS (SUPABASE PROPIO)
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. TIPOS Y ROLES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO anon, authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Función para verificar si un usuario es admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. TABLA PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  size TEXT NOT NULL,
  category TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  price_ars NUMERIC(12,2) NOT NULL CHECK (price_ars >= 0),
  stock INTEGER NOT NULL DEFAULT 10 CHECK (stock >= 0),
  image_url TEXT,
  description TEXT,
  free_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Función generadora de slugs
CREATE OR REPLACE FUNCTION public.generate_product_slug(p_brand text, p_model text, p_size text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base text;
BEGIN
  base := lower(unaccent(coalesce(p_brand, '') || '-' || coalesce(p_model, '') || '-' || coalesce(p_size, '')));
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  IF base = '' THEN
    base := 'producto';
  END IF;
  RETURN base;
END;
$$;

-- Trigger para slug automático
CREATE OR REPLACE FUNCTION public.set_product_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  candidate text;
  final_slug text;
  counter int := 1;
BEGIN
  IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND (NEW.brand IS DISTINCT FROM OLD.brand OR NEW.model IS DISTINCT FROM OLD.model OR NEW.size IS DISTINCT FROM OLD.size)) THEN
    candidate := public.generate_product_slug(NEW.brand, NEW.model, NEW.size);
    final_slug := candidate;
    WHILE EXISTS (SELECT 1 FROM public.products WHERE slug = final_slug AND id IS DISTINCT FROM NEW.id) LOOP
      counter := counter + 1;
      final_slug := candidate || '-' || counter;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_product_slug ON public.products;
CREATE TRIGGER trg_set_product_slug
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_product_slug();

-- Trigger para validar categorías
CREATE OR REPLACE FUNCTION public.validate_product_categories()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.categories IS NULL OR array_length(NEW.categories, 1) IS NULL THEN
    IF NEW.category IS NOT NULL THEN
      NEW.categories := ARRAY[NEW.category];
    ELSE
      NEW.categories := ARRAY['autos'];
    END IF;
  END IF;
  NEW.category := NEW.categories[1];
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_product_categories_trg ON public.products;
CREATE TRIGGER validate_product_categories_trg
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.validate_product_categories();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
USING (is_active = TRUE OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
ON public.products FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. TABLA SITE_SETTINGS
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  phone TEXT NOT NULL DEFAULT '+54 9 11 2395-1455',
  whatsapp TEXT NOT NULL DEFAULT '5491123951455',
  email TEXT NOT NULL DEFAULT 'hola@leradial.com.ar',
  address TEXT NOT NULL DEFAULT 'Bartolomé Mitre 480, C1036AAH, Ciudad Autónoma de Buenos Aires, Argentina',
  business_name TEXT NOT NULL DEFAULT 'Le Radial SRL',
  cuit TEXT NOT NULL DEFAULT '',
  facebook TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  hours TEXT NOT NULL DEFAULT 'Lunes a Viernes de 8:00 a 17:00',
  business_hours TEXT NOT NULL DEFAULT 'Lunes a Viernes de 8:00 a 17:00',
  hero_eyebrow TEXT NOT NULL DEFAULT 'Nueva línea 2026',
  hero_title TEXT NOT NULL DEFAULT 'Brutus A/T',
  hero_subtitle TEXT NOT NULL DEFAULT 'Dominio total del terreno',
  hero_description TEXT NOT NULL DEFAULT 'Diseñada para ofrecer un equilibrio entre rendimiento y durabilidad en una amplia gama de condiciones de velocidad y terreno.',
  promo_banner TEXT NOT NULL DEFAULT 'Precios promocionales con descuentos especiales.',
  logo_url TEXT NOT NULL DEFAULT '',
  hero_image_url TEXT NOT NULL DEFAULT '',
  category_images JSONB NOT NULL DEFAULT '{}'::jsonb,
  bank_name TEXT NOT NULL DEFAULT '',
  bank_holder TEXT NOT NULL DEFAULT '',
  bank_cbu TEXT NOT NULL DEFAULT '',
  bank_alias TEXT NOT NULL DEFAULT '',
  bank_extra TEXT NOT NULL DEFAULT '',
  rate_usd NUMERIC NOT NULL DEFAULT 1450,
  rate_brl NUMERIC NOT NULL DEFAULT 279,
  rate_pyg NUMERIC NOT NULL DEFAULT 5.5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view settings" ON public.site_settings;
CREATE POLICY "Anyone can view settings" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;
CREATE POLICY "Admins can update settings" ON public.site_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Vista pública para site_settings
CREATE OR REPLACE VIEW public.site_settings_public AS
SELECT 
  id, address, business_name, category_images, email, facebook, 
  hero_description, hero_eyebrow, hero_image_url, hero_subtitle, hero_title, 
  hours, business_hours, instagram, logo_url, phone, promo_banner, 
  rate_brl, rate_pyg, rate_usd, updated_at, whatsapp 
FROM public.site_settings;

GRANT SELECT ON public.site_settings_public TO anon, authenticated;

-- 5. TABLA BANNERS
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.banners TO anon, authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active banners" ON public.banners;
CREATE POLICY "Anyone can view active banners"
ON public.banners FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert banners" ON public.banners;
CREATE POLICY "Admins can insert banners"
ON public.banners FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update banners" ON public.banners;
CREATE POLICY "Admins can update banners"
ON public.banners FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete banners" ON public.banners;
CREATE POLICY "Admins can delete banners"
ON public.banners FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. TABLA TESTIMONIALS
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  rating INT NOT NULL DEFAULT 5,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read approved testimonials" ON public.testimonials;
CREATE POLICY "Anyone can read approved testimonials"
ON public.testimonials FOR SELECT
USING (is_approved = true);

DROP POLICY IF EXISTS "Anyone can submit a testimonial (pending)" ON public.testimonials;
CREATE POLICY "Anyone can submit a testimonial (pending)"
ON public.testimonials FOR INSERT
WITH CHECK (is_approved = false);

DROP POLICY IF EXISTS "Admins can read all testimonials" ON public.testimonials;
CREATE POLICY "Admins can read all testimonials"
ON public.testimonials FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update testimonials" ON public.testimonials;
CREATE POLICY "Admins can update testimonials"
ON public.testimonials FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete testimonials" ON public.testimonials;
CREATE POLICY "Admins can delete testimonials"
ON public.testimonials FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. TABLA ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_ars NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendiente',
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  mp_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create valid orders" ON public.orders;
CREATE POLICY "Anyone can create valid orders"
ON public.orders FOR INSERT TO anon, authenticated
WITH CHECK (
  length(btrim(customer_name)) BETWEEN 2 AND 120
  AND length(btrim(customer_phone)) BETWEEN 5 AND 40
  AND jsonb_typeof(items) = 'array'
  AND status = 'pendiente'
);

DROP POLICY IF EXISTS "Admins can view orders" ON public.orders;
CREATE POLICY "Admins can view orders"
ON public.orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
ON public.orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders"
ON public.orders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 8. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
  ('site-assets', 'site-assets', true, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT USING (bucket_id IN ('product-images', 'site-assets'));

DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('product-images', 'site-assets') AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('product-images', 'site-assets') AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('product-images', 'site-assets') AND public.has_role(auth.uid(), 'admin'));

-- 9. PRODUCTOS INICIALES DE MUESTRA (Para que el sitio arranque con catálogo visible)
INSERT INTO public.products (brand, model, size, category, categories, price_ars, stock, is_featured, is_active)
VALUES
  ('XBRI', 'FORZA A/T 2', '205/65R15', 'camionetas', ARRAY['camionetas','suv'], 196928, 12, true, true),
  ('XBRI', 'SPORT PLUS F1 XL', '205/40ZR17', 'autos', ARRAY['autos'], 159800, 8, true, true),
  ('XBRI', 'ECOLOGY XL', '185/60R15', 'autos', ARRAY['autos'], 148165, 16, true, true),
  ('SUNSET TIRES', 'ALL TERRAIN T/A WL', '265/70R16', 'camionetas', ARRAY['camionetas','suv'], 281325, 6, true, true),
  ('LINGLONG', 'CROSSWIND H/T', '245/65R17', 'suv', ARRAY['suv','camionetas'], 273823, 10, true, true),
  ('LINGLONG', 'GREEN-MAX ECOTOURING', '175/65R14', 'autos', ARRAY['autos'], 129409, 20, false, true),
  ('FIREMAX', 'FM601', '205/55R16', 'autos', ARRAY['autos'], 141608, 14, false, true),
  ('LINGLONG', 'GREEN-MAX VAN', '195/70R15C', 'camiones', ARRAY['camiones'], 169725, 8, false, true)
ON CONFLICT DO NOTHING;
