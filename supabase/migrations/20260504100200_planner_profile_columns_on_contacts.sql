-- ============================================================================
-- EPIC #250 / Pilot parity — Planner profile columns on contacts.
--
-- Adds optional columns used by the editorial-v1 planner detail UI
-- (PARITY-AUDIT-2026-04-21 rows PD-02..PD-07). Columns are nullable — the
-- frontend follows the ghost-pattern (hide section when null) so no backfill
-- is required to avoid visual regressions.
--
-- `contacts.location` already exists as UUID (preexisting FK-style column);
-- we add `contacts.location_name` as a display-label sibling.
--
-- Cross-refs:
--   - components/site/themes/editorial-v1/pages/planner-detail.tsx
--   - lib/supabase/get-planners.ts
--   - PARITY-AUDIT-2026-04-21.md (Section 08)
--
-- Idempotent via IF NOT EXISTS.
-- ============================================================================

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS trips_count integer,
  ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2),
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS specialties text[],
  ADD COLUMN IF NOT EXISTS regions text[],
  ADD COLUMN IF NOT EXISTS location_name text,
  ADD COLUMN IF NOT EXISTS languages text[],
  ADD COLUMN IF NOT EXISTS signature_package_id uuid REFERENCES public.package_kits(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS personal_details jsonb;

COMMENT ON COLUMN public.contacts.trips_count IS 'Planner profile: total viajes diseñados (matrix PD-02)';
COMMENT ON COLUMN public.contacts.rating_avg IS 'Planner profile: rating promedio 0-5 (matrix PD-02)';
COMMENT ON COLUMN public.contacts.years_experience IS 'Planner profile: años de experiencia (matrix PD-02)';
COMMENT ON COLUMN public.contacts.specialties IS 'Planner profile: pills Lo que hace diferente (matrix PD-04)';
COMMENT ON COLUMN public.contacts.regions IS 'Planner profile: regiones cubiertas para chips hero (matrix PD-03)';
COMMENT ON COLUMN public.contacts.location_name IS 'Planner profile: ciudad base display label (matrix PD-03). Distinto de location UUID.';
COMMENT ON COLUMN public.contacts.languages IS 'Planner profile: idiomas (matrix PD-02); prefiere arreglo sobre contacts.language singular';
COMMENT ON COLUMN public.contacts.signature_package_id IS 'Planner profile: paquete firma destacado (matrix PD-05)';
COMMENT ON COLUMN public.contacts.personal_details IS 'Planner profile: jsonb para "Detalles personales" 3-card grid (matrix PD-07)';
