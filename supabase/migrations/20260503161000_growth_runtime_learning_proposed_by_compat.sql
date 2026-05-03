-- ============================================================================
-- Growth OS Runtime learning compatibility — proposed_by
-- ============================================================================
-- Purpose:
--   Align existing remote learning tables with the Runtime Score 8.5/10 code
--   path, which records who proposed memory and skill draft candidates.
-- ============================================================================

alter table public.growth_agent_memories
  add column if not exists proposed_by text not null default 'codex_runtime';

alter table public.growth_agent_skills
  add column if not exists proposed_by text not null default 'codex_runtime';
