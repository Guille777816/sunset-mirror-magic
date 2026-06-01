
-- Bucket público para imágenes de productos
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;

-- Bucket público para logo y portada del sitio
INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets', 'site-assets', true) ON CONFLICT (id) DO NOTHING;

-- Políticas: lectura pública, escritura solo admin
CREATE POLICY "Public read product-images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admin write product-images insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write product-images update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write product-images delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND has_role(auth.uid(),'admin'));

CREATE POLICY "Public read site-assets" ON storage.objects FOR SELECT USING (bucket_id = 'site-assets');
CREATE POLICY "Admin write site-assets insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-assets' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write site-assets update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'site-assets' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write site-assets delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'site-assets' AND has_role(auth.uid(),'admin'));

-- Nuevos campos en site_settings para logo y portada
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hero_image_url text NOT NULL DEFAULT '';
