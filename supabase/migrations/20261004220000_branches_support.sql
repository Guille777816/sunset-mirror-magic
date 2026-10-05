-- Migración para soporte de múltiples sucursales
-- Las sucursales se guardan dentro del objeto JSONB category_images en site_settings
-- bajo la clave 'branches_data' para compatibilidad total con site_settings_public.

COMMENT ON COLUMN public.site_settings.category_images IS 'Contiene las imágenes de categorías y el array serializado de sucursales (branches_data)';
