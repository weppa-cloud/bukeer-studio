-- ============================================================================
-- Growth Control Plane Canary Seed — ColombiaTours pt-BR
-- ============================================================================
-- Purpose:
--   Seed canary data for ColombiaTours es-CO/CO → pt-BR/BR transcreation agent
--   into the new control-plane governance tables.
--
-- Tables seeded:
--   1. growth_capabilities — enables transcreation capability for pt-BR/BR
--   2. growth_agent_definitions — defines colombiatours-ptbr-transcreator agent
--
-- Safety:
--   - Transactional: BEGIN/COMMIT/ROLLBACK wrapper
--   - No provider calls
--   - canary_only = true (not production)
--   - Insert-only, idempotent via UNIQUE constraints
--
-- Prerequisites:
--   - Migration M1 applied (governance tables exist)
--   - ColombiaTours website exists (id = 894545b7-73ca-4dae-b76a-da5b6a3f8441)
--
-- Reference:
--   SPEC_GROWTH_CONTROL_PLANE_PHASE1_MIGRATIONS.md §4
-- ============================================================================

-- ============================================================================
-- Seed 1: growth_capabilities — transcreation for pt-BR/BR
-- ============================================================================
INSERT INTO public.growth_capabilities (
  account_id, website_id, locale, market, lane,
  capability, enabled, canary_only
)
SELECT
  w.account_id,
  w.id AS website_id,
  'pt-BR' AS locale,
  'BR' AS market,
  'transcreation' AS lane,
  'transcreation' AS capability,
  true AS enabled,
  true AS canary_only
FROM public.websites w
WHERE w.id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND NOT EXISTS (
    SELECT 1
    FROM public.growth_capabilities gc
    WHERE gc.website_id = w.id
      AND gc.locale = 'pt-BR'
      AND gc.market = 'BR'
      AND gc.lane = 'transcreation'
      AND gc.capability = 'transcreation'
  );

-- ============================================================================
-- Seed 2: growth_agent_definitions — colombiatours-ptbr-transcreator
-- ============================================================================
INSERT INTO public.growth_agent_definitions (
  account_id, website_id, agent_name, lane, profile_type,
  locale, market, schema_ref,
  allowed_actions, blocked_actions,
  canary_only, enabled
)
SELECT
  w.account_id,
  w.id AS website_id,
  'colombiatours-ptbr-transcreator' AS agent_name,
  'transcreation' AS lane,
  'transcreation_agent' AS profile_type,
  'pt-BR' AS locale,
  'BR' AS market,
  'TranscreationAgentSchema' AS schema_ref,
  ARRAY['observe', 'prepare', 'safe_apply']::text[] AS allowed_actions,
  ARRAY['call_provider_api_directly', 'paid_mutation', 'experiment_activation']::text[] AS blocked_actions,
  true AS canary_only,
  true AS enabled
FROM public.websites w
WHERE w.id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  AND NOT EXISTS (
    SELECT 1
    FROM public.growth_agent_definitions gad
    WHERE gad.website_id = w.id
      AND gad.agent_name = 'colombiatours-ptbr-transcreator'
      AND gad.locale = 'pt-BR'
      AND gad.market = 'BR'
  );

-- ============================================================================
-- Verification: query seeded rows
-- ============================================================================
-- SELECT
--   'growth_capabilities' AS table_name,
--   COUNT(*) AS rows_seeded
-- FROM public.growth_capabilities
-- WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
--   AND locale = 'pt-BR'
--   AND market = 'BR'
--   AND lane = 'transcreation'
-- UNION ALL
-- SELECT
--   'growth_agent_definitions' AS table_name,
--   COUNT(*) AS rows_seeded
-- FROM public.growth_agent_definitions
-- WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
--   AND agent_name = 'colombiatours-ptbr-transcreator';