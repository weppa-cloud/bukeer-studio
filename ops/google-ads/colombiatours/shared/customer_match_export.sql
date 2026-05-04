-- Customer Match audience export — ColombiaTours
-- Output: CSV listo para subir a Google Ads → Audience manager → Customer list
-- Format: Email, Phone, First Name, Last Name, Country, ZIP
-- Email/phone se hashean automáticamente (SHA-256) por Google al subir.
--
-- Run: copiar a Supabase SQL Editor proyecto `bukeer` y exportar resultado a CSV.
-- Mín 100 contactos para activar audience. Refresh cada 30-60 días.

WITH ct_contacts AS (
  SELECT DISTINCT
    LOWER(TRIM(c.email))                                AS Email,
    -- Phone E.164 (con +) — Google Ads requiere E.164 para hashing
    CASE
      WHEN c.phone ~ '^\+[0-9]{8,15}$' THEN c.phone
      WHEN c.phone ~ '^[0-9]{10,15}$' AND c.country_code = 'CO'
        THEN '+57' || c.phone
      WHEN c.phone ~ '^[0-9]{10,15}$' AND c.country_code = 'MX'
        THEN '+52' || c.phone
      WHEN c.phone ~ '^[0-9]{9}$' AND c.country_code = 'ES'
        THEN '+34' || c.phone
      WHEN c.phone ~ '^[0-9]{10}$' AND c.country_code IN ('US', 'CA')
        THEN '+1' || c.phone
      ELSE NULL
    END                                                 AS Phone,
    INITCAP(SPLIT_PART(c.first_name, ' ', 1))           AS "First Name",
    INITCAP(c.last_name)                                AS "Last Name",
    UPPER(c.country_code)                               AS Country,
    NULL::text                                          AS Zip
  FROM contacts c
  WHERE c.account_id = '9fc24733-b127-4184-aa22-12f03b98927a'  -- ColombiaTours
    AND (c.email IS NOT NULL OR c.phone IS NOT NULL)
    AND c.created_at >= now() - INTERVAL '24 months'  -- Google Ads soporta hasta 540d
)
SELECT Email, Phone, "First Name", "Last Name", Country, Zip
FROM ct_contacts
WHERE Email IS NOT NULL OR Phone IS NOT NULL
ORDER BY Email NULLS LAST, Phone NULLS LAST;

-- Counts esperados (al 2026-05-03):
--   Total contacts ColombiaTours: 2,308
--   Con email válido: ~80% (~1,850)
--   Con phone E.164 válido: ~82% (~1,890)
--   Con email AND phone: ~70% (~1,615)
-- Threshold mínimo Google Ads: 100. Estamos muy por encima.
