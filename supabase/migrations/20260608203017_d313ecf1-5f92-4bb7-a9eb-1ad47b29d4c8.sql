DROP POLICY IF EXISTS "Anyone can view settings" ON public.site_settings;
CREATE POLICY "Admins can view settings"
  ON public.site_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
REVOKE SELECT ON public.site_settings FROM anon;
GRANT SELECT ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;