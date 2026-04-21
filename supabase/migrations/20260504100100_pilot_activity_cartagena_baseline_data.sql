-- ============================================================================
-- EPIC #250 / Pilot parity — ColombiaTours baseline activity + package data.
--
-- Seeds realistic content into the pilot activity (`pilot-colombiatours-act-
-- baseline`) and the Cartagena package so the rendering parity audit can
-- verify P1 matrix rows end-to-end.
--
-- Cross-refs:
--   - Companion migration: `20260504100000_pilot_activity_detail_parity_fallbacks.sql`
--     — RPC fallbacks that surface these columns to the public renderer.
--   - `themes/references/claude design 1/PARITY-AUDIT-2026-04-21.md` — gaps
--     AD-01..AD-05 (activity) + P-01..P-04 (package) section 03 / 05.
--   - ADR-025 — Flutter-owned field ownership (schedule_data, metadata,
--     program_*). Seeded values here are safe because they mirror what a
--     Flutter admin would write; no schema changes.
--
-- Idempotent: uses UPDATE ... WHERE slug match; no inserts.
-- ============================================================================

update public.activities
set
  duration_minutes = 240,
  schedule_data = array[
    '{"time":"8:00 AM","title":"Punto de encuentro en Plaza Santo Domingo","description":"Nos reunimos frente a la estatua La Gorda Gertrudis para comenzar el recorrido."}'::jsonb,
    '{"time":"8:30 AM","title":"Recorrido por la muralla","description":"Caminata panorámica por la muralla histórica con vistas al mar Caribe."}'::jsonb,
    '{"time":"9:30 AM","title":"Plaza de los Coches y Torre del Reloj","description":"Historia del portal de los Dulces y de la entrada principal a la ciudad amurallada."}'::jsonb,
    '{"time":"10:15 AM","title":"Plaza de la Aduana y San Pedro Claver","description":"Visita a la iglesia y claustro de San Pedro Claver con narración del guía."}'::jsonb,
    '{"time":"11:00 AM","title":"Barrio de Getsemaní","description":"Grafitis, plazas populares y paradas culturales con sabor local."}'::jsonb,
    '{"time":"12:00 PM","title":"Cierre en Café del Mar","description":"Vista panorámica desde el baluarte y opción de bebida refrescante (no incluida)."}'::jsonb
  ],
  metadata = coalesce(metadata, '{}'::jsonb) || '{"meeting_point":{"latitude":10.4236,"longitude":-75.5514,"address":"Plaza Santo Domingo, Cartagena de Indias","city":"Cartagena","country":"Colombia"}}'::jsonb,
  program_notes = E'Usa ropa ligera y cómoda. Lleva protector solar, gorra y agua adicional. El recorrido es caminado y dura aproximadamente 4 horas.\nLlega 10 minutos antes del inicio. El tour se realiza con lluvia o sol; llevar impermeable en temporada de lluvias.',
  program_meeting_info = 'Plaza Santo Domingo — frente a la estatua La Gorda Gertrudis. Llegar 10 minutos antes.',
  program_gallery = '[
    {"url":"https://images.unsplash.com/photo-1528702748617-c64d49f918af?w=1600","alt":"Torre del Reloj Cartagena"},
    {"url":"https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?w=1600","alt":"Muralla histórica Cartagena"},
    {"url":"https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=1600","alt":"Plaza colonial Cartagena"},
    {"url":"https://images.unsplash.com/photo-1559508551-44bff1de756b?w=1600","alt":"Calles coloridas Getsemaní"},
    {"url":"https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600","alt":"Atardecer Café del Mar"}
  ]'::jsonb,
  cover_image_url = coalesce(cover_image_url, 'https://images.unsplash.com/photo-1528702748617-c64d49f918af?w=1600'),
  main_image = coalesce(main_image, 'https://images.unsplash.com/photo-1528702748617-c64d49f918af?w=1600'),
  social_image = coalesce(social_image, 'https://images.unsplash.com/photo-1528702748617-c64d49f918af?w=1600'),
  description = case
    when description is null
      or length(trim(description)) < 80
      or description like 'W6 matrix%'
    then 'Explora la Cartagena amurallada al atardecer con guía local bilingüe: muralla, Torre del Reloj, Plaza de la Aduana, San Pedro Claver, Getsemaní y el mirador del Café del Mar. Un recorrido caminable de 4 horas que combina historia, arquitectura colonial y el sabor del Caribe.'
    else description
  end
where slug = 'pilot-colombiatours-act-baseline';

update public.package_kits
set
  program_gallery = '[
    {"url":"https://images.unsplash.com/photo-1528702748617-c64d49f918af?w=1600","alt":"Torre del Reloj Cartagena"},
    {"url":"https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?w=1600","alt":"Muralla histórica Cartagena"},
    {"url":"https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=1600","alt":"Plaza colonial Cartagena"},
    {"url":"https://images.unsplash.com/photo-1559508551-44bff1de756b?w=1600","alt":"Calles coloridas Getsemaní"},
    {"url":"https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600","alt":"Atardecer Café del Mar"}
  ]'::jsonb,
  cover_image_url = coalesce(cover_image_url, 'https://images.unsplash.com/photo-1528702748617-c64d49f918af?w=1600')
where slug = 'paquete-cartagena-5-dias';
