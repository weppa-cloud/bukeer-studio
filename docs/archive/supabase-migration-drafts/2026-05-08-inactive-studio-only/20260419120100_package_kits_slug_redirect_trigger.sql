-- ============================================================================
-- Issue #210 — Phase 1B: package_kits slug redirect trigger
--
-- Writes `slug_redirects` rows automatically when a package_kit slug changes,
-- so the Studio middleware (`middleware.ts` → `getRedirectedSlug`) can serve
-- 301s from the old URL. This is a DB-level guarantee — fires no matter which
-- surface (Flutter, Studio server action, direct SQL) issued the UPDATE.
--
-- The `slug_redirects` table (account_id, product_type, old_slug, new_slug)
-- is maintained by the Flutter repo / sibling product triggers
-- (`track_product_slug_redirect` for activities + hotels). A direct INSERT is
-- used here instead of a helper RPC to avoid cross-repo coupling. `ON CONFLICT
-- DO NOTHING` tolerates the case where the same rename happens twice
-- (reverting via a chain of updates re-uses an existing row rather than
-- breaking the trigger).
--
-- Audit log: also emits a `slug_changed` row into `package_kits_audit_log`
-- (present since 2026-04-26) through the `changed_fields` column. The existing
-- `fn_audit_package_kits` already captures slug in the `changed_fields` array
-- diff, so no duplicate write is needed here — we only add the dedicated
-- `slug_redirects` INSERT.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_package_kits_slug_redirect ON public.package_kits;
--   DROP FUNCTION IF EXISTS public.package_kits_slug_redirect_tg();
-- ============================================================================

CREATE OR REPLACE FUNCTION public.package_kits_slug_redirect_tg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.slug IS NOT NULL AND NEW.slug IS DISTINCT FROM OLD.slug THEN
    INSERT INTO public.slug_redirects (account_id, product_type, old_slug, new_slug)
    VALUES (NEW.account_id, 'package', OLD.slug, NEW.slug)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_package_kits_slug_redirect ON public.package_kits;

CREATE TRIGGER trg_package_kits_slug_redirect
  AFTER UPDATE OF slug ON public.package_kits
  FOR EACH ROW
  EXECUTE FUNCTION public.package_kits_slug_redirect_tg();
