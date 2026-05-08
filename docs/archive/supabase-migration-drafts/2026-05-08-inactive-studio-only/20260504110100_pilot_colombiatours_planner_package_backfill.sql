-- ============================================================================
-- EPIC #250 / Pilot parity — ColombiaTours backfill for planner↔package links.
--
-- Hydrates the newly-added `contacts.signature_package_id` (PD-05) and
-- `package_kits.planner_id` (PD-06) FKs for the 4 pilot planners so the
-- editorial-v1 planner-detail "Viaje firma" card and "Otros paquetes que
-- diseña" grid render out of the box on colombiatours.travel.
--
-- Assignments (distribution reflects each planner's regional theme):
--   · Leidy Giraldo   — Andes/café: Eje cafetero 4d (firma), Bogotá 4d,
--                       Multidestino en Colombia 9d
--   · Paola Henao     — Caribe: Cartagena 5d (firma), Santa Marta 5d,
--                       Paseando por Colombia 7d
--   · Susana Guerra   — Medellín/Multi: Medellín 5d (firma), Multidestino 15d
--   · Yenny Giraldo   — Familiar: Vacaciones familiares 15d (firma)
--
-- Idempotent: UPDATE ... WHERE id = ... and WHERE planner_id IS NULL guards
-- re-runs from clobbering manual edits.
--
-- NOTE: data-only backfill; schema lives in 20260504100200 (signature) and
-- 20260504110000 (planner_id on package_kits). Applied live during pilot
-- cutover 2026-04-21 via Supabase MCP; committing here so non-prod
-- environments get parity when migrations replay.
-- ============================================================================

-- Signature packages per planner ------------------------------------------------
UPDATE public.contacts
  SET signature_package_id = 'dc7e9b2b-7873-417a-a025-65008027a688'
  WHERE id = 'c1b8a9ce-5e96-4c00-8674-221b6b0199e4' -- Leidy Giraldo
    AND signature_package_id IS NULL;

UPDATE public.contacts
  SET signature_package_id = '9b915c08-e74a-4c8d-a2b1-4fc62b08d0cc'
  WHERE id = '1facc2b1-b974-42ea-aa2d-9c0468764b13' -- Paola Henao
    AND signature_package_id IS NULL;

UPDATE public.contacts
  SET signature_package_id = 'b9c71c8e-9488-446a-ab0c-5bc7e7107afa'
  WHERE id = 'b5cdb431-3533-439e-891d-d08b0f411f53' -- Susana Guerra
    AND signature_package_id IS NULL;

UPDATE public.contacts
  SET signature_package_id = 'fe7a1603-d434-4228-8d6e-d051d5bb7dc9'
  WHERE id = '0bda3ab6-1870-4c1d-946d-23342b3cb1f7' -- Yenny Giraldo
    AND signature_package_id IS NULL;

-- package_kits.planner_id ownership --------------------------------------------
UPDATE public.package_kits
  SET planner_id = 'c1b8a9ce-5e96-4c00-8674-221b6b0199e4' -- Leidy
  WHERE planner_id IS NULL
    AND id IN (
      'dc7e9b2b-7873-417a-a025-65008027a688', -- Paquete - Eje cafetero 4 Días
      '09d6ed37-cf9b-46fc-ad3f-f2efc510e541', -- Paquete Bogotá 4 Días
      '102628e8-00a6-49a2-aee7-19a1b0cf952d'  -- Paquete - Multidestino en Colombia 9 Días
    );

UPDATE public.package_kits
  SET planner_id = '1facc2b1-b974-42ea-aa2d-9c0468764b13' -- Paola
  WHERE planner_id IS NULL
    AND id IN (
      '9b915c08-e74a-4c8d-a2b1-4fc62b08d0cc', -- Paquete - Cartagena 5 Dias
      '2b8a9446-5e0a-4847-95f7-0cc0286bbe9e', -- Santa Marta 5 Días
      '9d992769-75f8-4d64-8b47-c39d15fd829f'  -- Paquete - Paseando por Colombia 7 Días
    );

UPDATE public.package_kits
  SET planner_id = 'b5cdb431-3533-439e-891d-d08b0f411f53' -- Susana
  WHERE planner_id IS NULL
    AND id IN (
      'b9c71c8e-9488-446a-ab0c-5bc7e7107afa', -- Paquete - Medellín 5 Días
      '53231d47-bebb-4f98-9927-ba80e6e98ad2'  -- Paquete Multidestino 15 Días
    );

UPDATE public.package_kits
  SET planner_id = '0bda3ab6-1870-4c1d-946d-23342b3cb1f7' -- Yenny
  WHERE planner_id IS NULL
    AND id = 'fe7a1603-d434-4228-8d6e-d051d5bb7dc9'; -- Paquete - Vacaciones Familiares por Colombia 15 Días
