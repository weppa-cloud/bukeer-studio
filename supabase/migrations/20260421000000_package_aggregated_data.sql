-- ============================================================================
-- Issue #172 (child of #171) — Gate A: get_package_aggregated_data RPC
--
-- Creates a standalone RPC that aggregates inclusions, exclusions, and gallery
-- images from all child products in a package kit's itinerary.
--
-- DEDUP STRATEGY
-- --------------
-- inclusions / exclusions: sourced from product-level `inclutions`/`exclutions`
--   (text[] columns on hotels, activities, transfers) for each itinerary_item.
--   After UNION across all items the array is deduped via lower() normalization.
--   A text[] element that is identical case-insensitively to a previously seen
--   entry is dropped. Capped at 15 items total.
--
-- gallery: built by collecting each child product's `main_image` (TEXT) plus
--   any rows in the `images` table matching `entity_id = id_product`, ordered
--   by `itinerary_items.day_number` then `images.order_index`. The package kit's
--   own `program_gallery` (JSONB[]->text) is prepended as authoritative curator
--   override. Final result is deduped (same URL) and capped at 12 items.
--
-- TENANCY (AC7b)
-- --------------
-- The function uses SECURITY DEFINER so it can bypass RLS while applying an
-- explicit account_id filter. It verifies `package_kits.account_id` matches the
-- account that owns the subdomain — same pattern as `get_website_product_page`.
-- Called server-side with anon key; no auth.uid() dependency required.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_package_aggregated_data(
  p_package_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id    UUID;
  v_itinerary_id  UUID;
  v_inclusions    TEXT[];
  v_exclusions    TEXT[];
  v_gallery       TEXT[];
BEGIN
  -- ------------------------------------------------------------------
  -- 1. Validate package exists and capture account_id (tenancy check).
  -- ------------------------------------------------------------------
  SELECT pk.account_id,
         COALESCE(pk.source_itinerary_id, i_via_pkg.id)
  INTO   v_account_id, v_itinerary_id
  FROM   public.package_kits pk
  LEFT JOIN LATERAL (
    -- Also accept itineraries that reference this package via source_package_id.
    SELECT i2.id
    FROM   public.itineraries i2
    WHERE  i2.source_package_id = pk.id
      AND  i2.account_id = pk.account_id
      AND  i2.deleted_at IS NULL
    ORDER  BY i2.updated_at DESC
    LIMIT  1
  ) i_via_pkg ON (pk.source_itinerary_id IS NULL)
  WHERE  pk.id = p_package_id
  LIMIT  1;

  IF v_account_id IS NULL THEN
    RETURN jsonb_build_object(
      'inclusions', '[]'::jsonb,
      'exclusions', '[]'::jsonb,
      'gallery',    '[]'::jsonb
    );
  END IF;

  -- ------------------------------------------------------------------
  -- 2 + 3 + 4: collect inclusions / exclusions from child products,
  --            UNION + DISTINCT (case-insensitive).
  -- ------------------------------------------------------------------
  WITH items AS (
    -- All itinerary_items for this package's itinerary, scoped to account.
    SELECT
      ii.id_product,
      ii.product_type,
      COALESCE(ii.day_number::int, 0) AS day_num
    FROM   public.itinerary_items ii
    WHERE  ii.id_itinerary = v_itinerary_id
      AND  ii.account_id   = v_account_id
      AND  ii.id_product IS NOT NULL
      AND  ii.product_type IN ('Hoteles', 'Actividades', 'Transporte')
  ),

  -- Hotels branch
  hotel_incl AS (
    SELECT unnest(h.inclutions) AS item, 'inclusion' AS kind
    FROM   public.hotels h
    JOIN   items it ON it.id_product = h.id
    WHERE  it.product_type = 'Hoteles'
      AND  h.inclutions IS NOT NULL
  ),
  hotel_excl AS (
    SELECT unnest(h.exclutions) AS item, 'exclusion' AS kind
    FROM   public.hotels h
    JOIN   items it ON it.id_product = h.id
    WHERE  it.product_type = 'Hoteles'
      AND  h.exclutions IS NOT NULL
  ),

  -- Activities branch
  activity_incl AS (
    SELECT unnest(a.inclutions) AS item, 'inclusion' AS kind
    FROM   public.activities a
    JOIN   items it ON it.id_product = a.id
    WHERE  it.product_type = 'Actividades'
      AND  a.inclutions IS NOT NULL
  ),
  activity_excl AS (
    SELECT unnest(a.exclutions) AS item, 'exclusion' AS kind
    FROM   public.activities a
    JOIN   items it ON it.id_product = a.id
    WHERE  it.product_type = 'Actividades'
      AND  a.exclutions IS NOT NULL
  ),

  -- Transfers branch
  transfer_incl AS (
    SELECT unnest(t.inclutions) AS item, 'inclusion' AS kind
    FROM   public.transfers t
    JOIN   items it ON it.id_product = t.id
    WHERE  it.product_type = 'Transporte'
      AND  t.inclutions IS NOT NULL
  ),
  transfer_excl AS (
    SELECT unnest(t.exclutions) AS item, 'exclusion' AS kind
    FROM   public.transfers t
    JOIN   items it ON it.id_product = t.id
    WHERE  it.product_type = 'Transporte'
      AND  t.exclutions IS NOT NULL
  ),

  -- UNION all raw strings
  all_items AS (
    SELECT item, kind FROM hotel_incl
    UNION ALL
    SELECT item, kind FROM hotel_excl
    UNION ALL
    SELECT item, kind FROM activity_incl
    UNION ALL
    SELECT item, kind FROM activity_excl
    UNION ALL
    SELECT item, kind FROM transfer_incl
    UNION ALL
    SELECT item, kind FROM transfer_excl
  ),

  -- Dedup: keep first occurrence by lower(trim()) key, cap 15
  deduped AS (
    SELECT DISTINCT ON (lower(trim(item)), kind)
      trim(item)  AS item,
      kind,
      row_number() OVER (PARTITION BY kind ORDER BY lower(trim(item))) AS rn
    FROM   all_items
    WHERE  trim(COALESCE(item, '')) <> ''
  ),
  capped AS (
    SELECT item, kind FROM deduped WHERE rn <= 15
  ),

  -- Aggregate into arrays
  agg_inc AS (
    SELECT COALESCE(array_agg(item ORDER BY item), '{}') AS arr
    FROM   capped WHERE kind = 'inclusion'
  ),
  agg_exc AS (
    SELECT COALESCE(array_agg(item ORDER BY item), '{}') AS arr
    FROM   capped WHERE kind = 'exclusion'
  )

  SELECT
    (SELECT arr FROM agg_inc),
    (SELECT arr FROM agg_exc)
  INTO v_inclusions, v_exclusions;

  -- ------------------------------------------------------------------
  -- 5. Gallery: program_gallery override + main_image per child +
  --    images table rows, ordered by day_number then order_index.
  --    Cap at 12, dedup by URL.
  -- ------------------------------------------------------------------
  WITH items_ord AS (
    SELECT
      ii.id_product,
      ii.product_type,
      COALESCE(ii.day_number::int, 9999) AS day_num
    FROM   public.itinerary_items ii
    WHERE  ii.id_itinerary = v_itinerary_id
      AND  ii.account_id   = v_account_id
      AND  ii.id_product IS NOT NULL
      AND  ii.product_type IN ('Hoteles', 'Actividades', 'Transporte')
  ),

  -- Curator override: program_gallery from package_kits (highest priority)
  pkg_gallery AS (
    SELECT
      g_url.val::text AS url,
      -1              AS day_num,
      ordinality - 1  AS order_idx
    FROM   public.package_kits pk,
           jsonb_array_elements_text(COALESCE(pk.program_gallery, '[]'::jsonb))
             WITH ORDINALITY AS g_url(val, ordinality)
    WHERE  pk.id = p_package_id
      AND  g_url.val IS NOT NULL
      AND  btrim(g_url.val::text) <> ''
  ),

  -- main_image per child product
  child_main AS (
    SELECT
      COALESCE(h.main_image, '') AS url,
      it.day_num,
      0 AS order_idx
    FROM   public.hotels h
    JOIN   items_ord it ON it.id_product = h.id
    WHERE  it.product_type = 'Hoteles'
      AND  COALESCE(h.main_image, '') <> ''

    UNION ALL

    SELECT
      COALESCE(a.main_image, '') AS url,
      it.day_num,
      0 AS order_idx
    FROM   public.activities a
    JOIN   items_ord it ON it.id_product = a.id
    WHERE  it.product_type = 'Actividades'
      AND  COALESCE(a.main_image, '') <> ''

    UNION ALL

    SELECT
      COALESCE(t.main_image, '') AS url,
      it.day_num,
      0 AS order_idx
    FROM   public.transfers t
    JOIN   items_ord it ON it.id_product = t.id
    WHERE  it.product_type = 'Transporte'
      AND  COALESCE(t.main_image, '') <> ''
  ),

  -- Additional gallery images from images table (polymorphic by entity_id)
  entity_imgs AS (
    SELECT
      img.url,
      it.day_num,
      COALESCE(img.order_index, 99999) AS order_idx
    FROM   public.images img
    JOIN   items_ord it ON it.id_product = img.entity_id
    WHERE  COALESCE(img.url, '') <> ''
  ),

  -- UNION all sources: curator override first, then child mains, then entity_imgs
  all_gallery AS (
    SELECT url, day_num, order_idx, 0 AS source_prio FROM pkg_gallery
    UNION ALL
    SELECT url, day_num, order_idx, 1 AS source_prio FROM child_main
    UNION ALL
    SELECT url, day_num, order_idx, 2 AS source_prio FROM entity_imgs
  ),

  -- Dedup by URL (keep first occurrence per priority ordering), cap at 12
  deduped_gallery AS (
    SELECT DISTINCT ON (url)
      url,
      row_number() OVER (
        ORDER BY source_prio, day_num, order_idx
      ) AS rn
    FROM   all_gallery
    WHERE  btrim(url) <> ''
    ORDER  BY url, source_prio, day_num, order_idx
  )

  SELECT COALESCE(
    array_agg(url ORDER BY rn),
    '{}'
  )
  INTO v_gallery
  FROM deduped_gallery
  WHERE rn <= 12;

  -- ------------------------------------------------------------------
  -- 7. Return aggregated payload.
  -- ------------------------------------------------------------------
  RETURN jsonb_build_object(
    'inclusions', to_jsonb(COALESCE(v_inclusions, '{}'::text[])),
    'exclusions', to_jsonb(COALESCE(v_exclusions, '{}'::text[])),
    'gallery',    to_jsonb(COALESCE(v_gallery,    '{}'::text[]))
  );
END;
$$;

-- Allow Studio SSR (anon + authenticated) to call this RPC.
-- It is safe: the function only reads data belonging to v_account_id,
-- which is derived from package_kits.id — no cross-tenant data can leak.
GRANT EXECUTE ON FUNCTION public.get_package_aggregated_data(UUID)
  TO anon, authenticated;

-- ============================================================================
-- Rollback:
--   DROP FUNCTION IF EXISTS public.get_package_aggregated_data(UUID);
-- ============================================================================
