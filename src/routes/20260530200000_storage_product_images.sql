-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view images (bucket is public)
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Only admins can upload images
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can delete images
CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin')
);
