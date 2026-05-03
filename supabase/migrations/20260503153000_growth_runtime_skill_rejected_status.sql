-- ============================================================================
-- Growth OS Runtime learning approvals — rejected skill drafts
-- ============================================================================
-- Purpose:
--   Allow Curators to reject draft skill candidates explicitly. `deprecated`
--   remains for previously active skills that should no longer be used.
-- ============================================================================

alter table public.growth_agent_skills
  drop constraint if exists growth_agent_skills_status_chk;

alter table public.growth_agent_skills
  add constraint growth_agent_skills_status_chk
  check (status in ('draft', 'active', 'rejected', 'deprecated'));

