
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS business_name text NOT NULL DEFAULT 'Le Radial',
  ADD COLUMN IF NOT EXISTS cuit text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hours text NOT NULL DEFAULT 'Lun a Vie 8:00 – 18:00 · Sáb 8:00 – 12:00';

UPDATE public.products SET is_featured = false WHERE is_featured = true;
