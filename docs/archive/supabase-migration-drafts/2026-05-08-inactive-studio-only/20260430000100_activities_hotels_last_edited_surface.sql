-- ============================================================================
-- #204 F2 — activities/hotels last_edited_by_surface column
-- Mirrors package_kits.last_edited_by_surface (R7). Enables polymorphic
-- reconciliation via product_edit_history + source. Backfill defaults to
-- 'flutter' since these entities are historically Flutter-authored.
-- ============================================================================

alter table public.activities
  add column if not exists last_edited_by_surface text
    check (last_edited_by_surface in ('flutter', 'studio', 'api', 'system'));

alter table public.hotels
  add column if not exists last_edited_by_surface text
    check (last_edited_by_surface in ('flutter', 'studio', 'api', 'system'));

update public.activities
  set last_edited_by_surface = 'flutter'
  where last_edited_by_surface is null;

update public.hotels
  set last_edited_by_surface = 'flutter'
  where last_edited_by_surface is null;

alter table public.activities
  alter column last_edited_by_surface set default 'flutter';

alter table public.hotels
  alter column last_edited_by_surface set default 'flutter';

-- Rollback:
-- alter table public.activities drop column if exists last_edited_by_surface;
-- alter table public.hotels drop column if exists last_edited_by_surface;
