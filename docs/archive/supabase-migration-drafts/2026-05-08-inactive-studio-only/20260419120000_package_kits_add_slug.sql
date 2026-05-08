-- ============================================================================
-- Issue #210 (parent #207) — Phase 1A: package_kits.slug column + backfill
--
-- Adds nullable `slug` column to `package_kits` so the Studio SSR layer can
-- read a canonical, stable slug per package (replaces name-derived fallback
-- which rotates on rename and breaks SEO equity).
--
-- Constraints:
--   - CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
--   - UNIQUE (account_id, slug) WHERE slug IS NOT NULL — nullable tolerated
--     during Phase 1/2 transition. NOT NULL comes in Phase 3.
--
-- Backfill strategy:
--   slugify(name) = lower → strip accents (fallback to raw lower if `unaccent`
--   extension missing) → collapse non-alphanumerics to `-` → trim leading/
--   trailing `-`. Collisions within same `account_id` get numeric suffix
--   (`-2`, `-3`, …). Rows with NULL or unslugifiable names are skipped (stay
--   NULL until Flutter editor sets them or Phase 3 enforcement).
--
-- RLS: slug column inherits existing `package_kits` RLS (account_id scoping),
-- no new policy required.
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_package_kits_slug_account;
--   ALTER TABLE public.package_kits DROP CONSTRAINT IF EXISTS package_kits_slug_format;
--   ALTER TABLE public.package_kits DROP COLUMN IF EXISTS slug;
-- ============================================================================

ALTER TABLE public.package_kits
  ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE public.package_kits
  DROP CONSTRAINT IF EXISTS package_kits_slug_format;

ALTER TABLE public.package_kits
  ADD CONSTRAINT package_kits_slug_format
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

CREATE UNIQUE INDEX IF NOT EXISTS idx_package_kits_slug_account
  ON public.package_kits (account_id, slug)
  WHERE slug IS NOT NULL;

-- ─── Backfill: slugify(name) with dedup suffix `-2`, `-3`, ... ───────────────
-- Uses `unaccent` extension when available (shared Bukeer project has it); if
-- absent, falls back to plain lower(name) which still satisfies the CHECK
-- regex for Latin-alphabet inputs.

DO $$
DECLARE
  r                 record;
  base_slug         text;
  candidate         text;
  n                 int;
  has_unaccent      boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'unaccent'
  ) INTO has_unaccent;

  FOR r IN
    SELECT id, account_id, name
      FROM public.package_kits
     WHERE slug IS NULL
       AND name IS NOT NULL
       AND btrim(name) <> ''
  LOOP
    IF has_unaccent THEN
      base_slug := regexp_replace(lower(public.unaccent(r.name)), '[^a-z0-9]+', '-', 'g');
    ELSE
      base_slug := regexp_replace(lower(r.name), '[^a-z0-9]+', '-', 'g');
    END IF;
    base_slug := regexp_replace(base_slug, '(^-+|-+$)', '', 'g');

    IF base_slug = '' THEN
      CONTINUE;
    END IF;

    candidate := base_slug;
    n := 1;
    WHILE EXISTS (
      SELECT 1 FROM public.package_kits
       WHERE account_id = r.account_id
         AND slug       = candidate
    ) LOOP
      n := n + 1;
      candidate := base_slug || '-' || n;
    END LOOP;

    UPDATE public.package_kits
       SET slug = candidate
     WHERE id = r.id;
  END LOOP;
END $$;
