-- ============================================================================
-- Editorial v1 — Dynamic data schema additions
-- ============================================================================
-- All additive, nullable, no breaking change.
-- Adds fields for brand-claim surfacing and editorial landing hydration.
--
-- Adapted to actual Bukeer schema:
--   - No `planners` table (uses `contacts.show_on_website`)
--   - No `destinations` table (uses `get_website_destinations` RPC).
--     Featured destinations are curated via the existing
--     `destination_seo_overrides` table (website-scoped, slug-keyed).
--   - No `google_reviews` table — uses `account_google_reviews` (JSONB).
--   - `websites` uses `content` jsonb; we do not add new top-level columns.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- accounts.founded_year — "X años en operación" brand claim.
-- ----------------------------------------------------------------------------
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS founded_year integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_founded_year_range_chk'
  ) THEN
    ALTER TABLE public.accounts
      ADD CONSTRAINT accounts_founded_year_range_chk
      CHECK (
        founded_year IS NULL
        OR (founded_year >= 1900 AND founded_year <= extract(year FROM now())::int)
      );
  END IF;
END $$;

COMMENT ON COLUMN public.accounts.founded_year IS
  'Editorial-v1 brand claim: year the agency was founded. Used to compute "X años operando".';

-- ----------------------------------------------------------------------------
-- package_kits.pricing_tiers — per-package tiers (Essential/Clásico/Premium).
-- ----------------------------------------------------------------------------
ALTER TABLE public.package_kits
  ADD COLUMN IF NOT EXISTS pricing_tiers jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'package_kits_pricing_tiers_array_chk'
  ) THEN
    ALTER TABLE public.package_kits
      ADD CONSTRAINT package_kits_pricing_tiers_array_chk
      CHECK (pricing_tiers IS NULL OR jsonb_typeof(pricing_tiers) = 'array');
  END IF;
END $$;

COMMENT ON COLUMN public.package_kits.pricing_tiers IS
  'Editorial-v1 pricing tiers: array of {name, price, currency?, features[], featured?} | null.';

-- ----------------------------------------------------------------------------
-- destination_seo_overrides.is_featured / featured_order — "Destino del mes".
-- No `destinations` table exists; featured destinations are curated per-website
-- via the existing overrides table, keyed by (website_id, destination_slug).
-- ----------------------------------------------------------------------------
ALTER TABLE public.destination_seo_overrides
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_order integer,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS tagline text;

CREATE INDEX IF NOT EXISTS destination_seo_overrides_featured_idx
  ON public.destination_seo_overrides (website_id, is_featured, featured_order)
  WHERE is_featured = true;

COMMENT ON COLUMN public.destination_seo_overrides.is_featured IS
  'Editorial-v1 hero "Destino del mes" curation flag.';
COMMENT ON COLUMN public.destination_seo_overrides.featured_order IS
  'Editorial-v1 sort order within featured destinations (NULLS LAST).';
COMMENT ON COLUMN public.destination_seo_overrides.hero_image_url IS
  'Editorial-v1 hero card image (overrides default destination image when set).';
COMMENT ON COLUMN public.destination_seo_overrides.headline IS
  'Editorial-v1 short hero headline for the featured destination card.';
COMMENT ON COLUMN public.destination_seo_overrides.tagline IS
  'Editorial-v1 short editorial tagline for the featured destination card.';

-- ----------------------------------------------------------------------------
-- contacts.quote — per-planner editorial quote.
-- (planners surface = `contacts` with `show_on_website = true`).
-- ----------------------------------------------------------------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS quote text;

COMMENT ON COLUMN public.contacts.quote IS
  'Editorial-v1 planner quote used in planners/team sections.';

-- ----------------------------------------------------------------------------
-- websites contact + legal surface columns. Only add if not already present.
-- These live outside `content` jsonb for easier structured editing in Flutter.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'websites' AND column_name = 'contact_whatsapp'
  ) THEN
    ALTER TABLE public.websites ADD COLUMN contact_whatsapp text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'websites' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE public.websites ADD COLUMN contact_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'websites' AND column_name = 'contact_address'
  ) THEN
    ALTER TABLE public.websites ADD COLUMN contact_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'websites' AND column_name = 'rnt'
  ) THEN
    ALTER TABLE public.websites ADD COLUMN rnt text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'websites' AND column_name = 'nit'
  ) THEN
    ALTER TABLE public.websites ADD COLUMN nit text;
  END IF;
END $$;

COMMENT ON COLUMN public.websites.contact_whatsapp IS
  'Editorial-v1 contact WhatsApp number (E.164) for CTAs + footer.';
COMMENT ON COLUMN public.websites.contact_email IS
  'Editorial-v1 contact email used in footer and contact sections.';
COMMENT ON COLUMN public.websites.contact_address IS
  'Editorial-v1 physical address string for footer.';
COMMENT ON COLUMN public.websites.rnt IS
  'Editorial-v1 Colombia Registro Nacional de Turismo number (legal footer).';
COMMENT ON COLUMN public.websites.nit IS
  'Editorial-v1 Colombia NIT (tax id) for legal footer.';

-- ============================================================================
-- RPC: public.get_brand_claims(p_account_id uuid)
-- Returns a single row with dynamic aggregates used by editorial-v1 sections.
-- ============================================================================
-- Notes on adjustments vs. original plan:
--   - No `planners` table → planners come from `contacts` (show_on_website=true,
--     deleted_at IS NULL). `rating` column does not exist on contacts, so
--     `planners_avg_rating` is returned as NULL until a rating field exists.
--   - No `destinations` table → we aggregate distinct city slugs from
--     `get_website_destinations`-equivalent logic: count distinct destinations
--     inferred from `locations` rows linked to `activities` + `hotels`
--     belonging to the account. We use `package_kits.destination` as a low-cost
--     approximation; callers may switch to a curated count later.
--   - `google_reviews` table → we read from `account_google_reviews`
--     (aggregate jsonb), which already stores `average_rating` +
--     `total_reviews`.
--   - `bookings.account_id` exists; we filter by it.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_brand_claims(p_account_id uuid)
RETURNS TABLE (
  years_in_operation integer,
  total_destinations integer,
  total_packages integer,
  total_activities integer,
  avg_rating numeric,
  total_reviews integer,
  satisfaction_pct integer,
  total_bookings integer,
  total_planners integer,
  planners_avg_rating numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_founded_year integer;
  v_current_year integer := extract(year FROM now())::int;
  v_total_destinations integer;
  v_total_packages integer;
  v_total_activities integer;
  v_total_planners integer;
  v_avg_rating numeric;
  v_total_reviews integer;
  v_total_bookings integer;
BEGIN
  SELECT founded_year
    INTO v_founded_year
    FROM public.accounts
   WHERE id = p_account_id;

  SELECT COUNT(DISTINCT lower(btrim(pk.destination)))::int
    INTO v_total_destinations
    FROM public.package_kits pk
   WHERE pk.account_id = p_account_id
     AND pk.destination IS NOT NULL
     AND btrim(pk.destination) <> '';

  SELECT COUNT(*)::int
    INTO v_total_packages
    FROM public.package_kits
   WHERE account_id = p_account_id;

  SELECT COUNT(*)::int
    INTO v_total_activities
    FROM public.activities
   WHERE account_id = p_account_id;

  SELECT COUNT(*)::int
    INTO v_total_planners
    FROM public.contacts
   WHERE account_id = p_account_id
     AND show_on_website = true
     AND deleted_at IS NULL;

  SELECT
    COALESCE(agr.average_rating, 0)::numeric,
    COALESCE(agr.total_reviews, 0)::int
    INTO v_avg_rating, v_total_reviews
    FROM public.account_google_reviews agr
   WHERE agr.account_id = p_account_id
   LIMIT 1;

  SELECT COUNT(*)::int
    INTO v_total_bookings
    FROM public.bookings
   WHERE account_id = p_account_id;

  RETURN QUERY SELECT
    CASE
      WHEN v_founded_year IS NULL THEN NULL
      ELSE (v_current_year - v_founded_year)::int
    END AS years_in_operation,
    COALESCE(v_total_destinations, 0) AS total_destinations,
    COALESCE(v_total_packages, 0) AS total_packages,
    COALESCE(v_total_activities, 0) AS total_activities,
    NULLIF(v_avg_rating, 0) AS avg_rating,
    COALESCE(v_total_reviews, 0) AS total_reviews,
    CASE
      WHEN v_avg_rating IS NULL OR v_avg_rating = 0 THEN NULL
      ELSE LEAST(100, GREATEST(0, (v_avg_rating * 20)::int))
    END AS satisfaction_pct,
    COALESCE(v_total_bookings, 0) AS total_bookings,
    COALESCE(v_total_planners, 0) AS total_planners,
    NULL::numeric AS planners_avg_rating;  -- no rating column on contacts yet
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_brand_claims(uuid)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_brand_claims(uuid) IS
  'Editorial-v1 brand claims aggregator. Returns a single row with dynamic
   facts (years in operation, totals, rating, satisfaction) derived from
   accounts, package_kits, activities, contacts, account_google_reviews,
   and bookings.';

-- Rollback:
-- drop function if exists public.get_brand_claims(uuid);
-- alter table public.destination_seo_overrides
--   drop column if exists tagline,
--   drop column if exists headline,
--   drop column if exists hero_image_url,
--   drop column if exists featured_order,
--   drop column if exists is_featured;
-- alter table public.contacts drop column if exists quote;
-- alter table public.package_kits drop column if exists pricing_tiers;
-- alter table public.accounts drop column if exists founded_year;
-- alter table public.websites
--   drop column if exists nit,
--   drop column if exists rnt,
--   drop column if exists contact_address,
--   drop column if exists contact_email,
--   drop column if exists contact_whatsapp;
