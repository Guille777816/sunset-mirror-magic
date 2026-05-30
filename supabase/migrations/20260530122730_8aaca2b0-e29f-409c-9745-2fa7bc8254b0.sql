
CREATE TABLE public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  phone TEXT NOT NULL DEFAULT '(376) 4-000000',
  whatsapp TEXT NOT NULL DEFAULT '5493764000000',
  email TEXT NOT NULL DEFAULT 'hola@leradial.com.ar',
  address TEXT NOT NULL DEFAULT 'Posadas, Misiones — Argentina',
  hero_eyebrow TEXT NOT NULL DEFAULT 'Nueva línea 2026',
  hero_title TEXT NOT NULL DEFAULT 'Brutus A/T',
  hero_subtitle TEXT NOT NULL DEFAULT 'Dominio total del terreno',
  hero_description TEXT NOT NULL DEFAULT 'Diseñada para ofrecer un equilibrio entre rendimiento y durabilidad en una amplia gama de condiciones de velocidad y terreno.',
  promo_banner TEXT NOT NULL DEFAULT 'Precios promocionales con descuentos especiales.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (id) VALUES ('main') ON CONFLICT DO NOTHING;

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update settings" ON public.site_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
