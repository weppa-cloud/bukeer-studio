-- ============================================================================
-- RFC #194 R7 — Studio Editor v2 Migration Plan (Phase 3 of 3)
-- Adds last_edited_by_surface column to package_kits.
-- Studio server action + Flutter writer must SET this in same transaction
-- as the field UPDATE (PCR fix — prevents stale reads during dual-write).
-- ============================================================================

alter table public.package_kits
  add column if not exists last_edited_by_surface text
    constraint package_kits_last_edited_surface_check
    check (last_edited_by_surface is null or last_edited_by_surface in ('flutter', 'studio'));

comment on column public.package_kits.last_edited_by_surface is
  'RFC #194 R7 — surface that last wrote this row. Set in same transaction as field UPDATE.';

-- Backfill existing rows: assume Flutter wrote everything before cutover
update public.package_kits
set last_edited_by_surface = 'flutter'
where last_edited_by_surface is null;

-- Rollback:
-- alter table public.package_kits drop column if exists last_edited_by_surface;
