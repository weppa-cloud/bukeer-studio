-- ============================================================================
-- EPIC #250 / Pilot parity — planner authorship link on package_kits.
--
-- Adds optional column `planner_id` (FK -> contacts.id) to expose the "Otros
-- paquetes que arma [planner]" grid in editorial-v1 planner-detail.tsx
-- (matrix PD-06). Opción A (1:N simple) — one planner owns N paquetes.
-- Columna nullable; ghost-pattern front-end esconde la grid cuando no hay
-- filas. Idempotent via IF NOT EXISTS.
--
-- Cross-refs:
--   - components/site/themes/editorial-v1/pages/planner-detail.tsx (relatedPackages)
--   - app/site/[subdomain]/planners/[slug]/page.tsx
--   - lib/supabase/get-planner-packages.ts
--   - 20260504100200_planner_profile_columns_on_contacts.sql (sibling: signature_package_id)
-- ============================================================================

ALTER TABLE public.package_kits
  ADD COLUMN IF NOT EXISTS planner_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.package_kits.planner_id IS 'Planner (contacts.id) autor/curador del paquete. Alimenta el grid "Otros paquetes que arma" en editorial-v1 planner-detail (matrix PD-06). Nullable: ghost-pattern UI.';

CREATE INDEX IF NOT EXISTS idx_package_kits_planner_id
  ON public.package_kits (planner_id)
  WHERE planner_id IS NOT NULL;
