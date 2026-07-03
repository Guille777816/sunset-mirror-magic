
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS rate_usd numeric NOT NULL DEFAULT 1450,
  ADD COLUMN IF NOT EXISTS rate_brl numeric NOT NULL DEFAULT 279,
  ADD COLUMN IF NOT EXISTS rate_pyg numeric NOT NULL DEFAULT 0.18;

CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  message text NOT NULL,
  image_url text,
  rating int NOT NULL DEFAULT 5,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT, INSERT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved testimonials"
  ON public.testimonials FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Anyone can submit a testimonial (pending)"
  ON public.testimonials FOR INSERT
  WITH CHECK (is_approved = false);

CREATE POLICY "Admins can read all testimonials"
  ON public.testimonials FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update testimonials"
  ON public.testimonials FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete testimonials"
  ON public.testimonials FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
