-- Actualización de datos de contacto en site_settings para Schema.org y frontend
UPDATE public.site_settings
SET 
  address = 'Bartolomé Mitre 480, C1036AAH, Ciudad Autónoma de Buenos Aires, Argentina',
  phone = '+54 9 11 2395-1455',
  updated_at = now()
WHERE id = 'main';
