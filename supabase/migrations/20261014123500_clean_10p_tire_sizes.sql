-- =====================================================================
-- Migración: Limpieza de '10P' y telas en la columna size de neumáticos
-- Objetivo: Que las medidas contengan exclusivamente los 3 números estándar
-- Ejemplo: '265/70R18 10P' -> '265/70R18'
-- =====================================================================

BEGIN;

-- 1. Elimina sufijos como ' 10P', '10P', ' 10PR', etc.
UPDATE public.products
SET 
  size = TRIM(REGEXP_REPLACE(size, '\s*\b\d{1,2}\s*P(R)?\b', '', 'gi')),
  updated_at = NOW()
WHERE size ~* '\s*\b\d{1,2}\s*P(R)?\b' OR size ~* '10P';

-- 2. Limpia espacios residuales si hubiera
UPDATE public.products
SET 
  size = TRIM(REGEXP_REPLACE(size, '\s+', ' ', 'g'))
WHERE size LIKE '%  %';

COMMIT;
