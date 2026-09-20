-- Actualización de datos de contacto y horarios en site_settings para Schema.org y frontend
ALTER TABLE public.site_settings 
  ADD COLUMN IF NOT EXISTS business_hours text NOT NULL DEFAULT 'Lunes a Viernes de 8:00 a 17:00';

UPDATE public.site_settings
SET 
  address = 'Bartolomé Mitre 480, C1036AAH, Ciudad Autónoma de Buenos Aires, Argentina',
  phone = '+54 9 11 2395-1455',
  hours = 'Lunes a Viernes de 8:00 a 17:00',
  business_hours = 'Lunes a Viernes de 8:00 a 17:00',
  updated_at = now()
WHERE id = 'main';

