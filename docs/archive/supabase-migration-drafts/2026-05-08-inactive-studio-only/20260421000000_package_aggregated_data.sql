-- ============================================================================
-- Issue #172 (child of #171) — Gate A: get_package_aggregated_data RPC
--
-- DEDUP STRATEGY
-- inclusions/exclusions: sourced from product-level inclutions/exclutions
--   (text columns, newline/bullet delimited). Split via regexp_split_to_table,
--   strip bullet prefix, dedup case-insensitively, cap 15.
-- gallery: kit program_gallery curator override first, then child main_image,
--   then images table by entity_id. Dedup by URL, ordered by day, cap 12.
--
-- TENANCY (AC7b): SECURITY DEFINER + explicit account_id check. No auth.uid().
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
  -- 1. Validate package + tenancy
  SELECT pk.account_id,
         COALESCE(pk.source_itinerary_id, i_via_pkg.id)
  INTO   v_account_id, v_itinerary_id
  FROM   public.package_kits pk
  LEFT JOIN LATERAL (
    SELECT i2.id FROM public.itineraries i2
    WHERE  i2.source_package_id = pk.id
      AND  i2.account_id = pk.account_id
      AND  i2.deleted_at IS NULL
    ORDER  BY i2.updated_at DESC LIMIT 1
  ) i_via_pkg ON (pk.source_itinerary_id IS NULL)
  WHERE  pk.id = p_package_id LIMIT 1;

  IF v_account_id IS NULL THEN
    RETURN jsonb_build_object('inclusions','[]'::jsonb,'exclusions','[]'::jsonb,'gallery','[]'::jsonb);
  END IF;

  -- 2. Collect inclusions/exclusions.
  -- inclutions/exclutions are plain TEXT with newline or "- " bullet delimiters.
  WITH items AS (
    SELECT ii.id_product, ii.product_type
    FROM   public.itinerary_items ii
    WHERE  ii.id_itinerary = v_itinerary_id
      AND  ii.account_id   = v_account_id
      AND  ii.id_product IS NOT NULL
      AND  ii.product_type IN ('Hoteles','Actividades','Transporte')
  ),
  raw_incl AS (
    SELECT regexp_split_to_table(h.inclutions, E'\\n') AS raw FROM public.hotels h JOIN items it ON it.id_product = h.id WHERE it.product_type = 'Hoteles' AND COALESCE(h.inclutions,'') <> ''
    UNION ALL
    SELECT regexp_split_to_table(a.inclutions, E'\\n') FROM public.activities a JOIN items it ON it.id_product = a.id WHERE it.product_type = 'Actividades' AND COALESCE(a.inclutions,'') <> ''
    UNION ALL
    SELECT regexp_split_to_table(t.inclutions, E'\\n') FROM public.transfers t JOIN items it ON it.id_product = t.id WHERE it.product_type = 'Transporte' AND COALESCE(t.inclutions,'') <> ''
  ),
  raw_excl AS (
    SELECT regexp_split_to_table(h.exclutions, E'\\n') AS raw FROM public.hotels h JOIN items it ON it.id_product = h.id WHERE it.product_type = 'Hoteles' AND COALESCE(h.exclutions,'') <> ''
    UNION ALL
    SELECT regexp_split_to_table(a.exclutions, E'\\n') FROM public.activities a JOIN items it ON it.id_product = a.id WHERE it.product_type = 'Actividades' AND COALESCE(a.exclutions,'') <> ''
    UNION ALL
    SELECT regexp_split_to_table(t.exclutions, E'\\n') FROM public.transfers t JOIN items it ON it.id_product = t.id WHERE it.product_type = 'Transporte' AND COALESCE(t.exclutions,'') <> ''
  ),
  cleaned_incl AS (
    SELECT regexp_replace(trim(raw), '^[-*•]\s*', '') AS item FROM raw_incl
    WHERE  trim(COALESCE(raw,'')) <> ''
  ),
  cleaned_excl AS (
    SELECT regexp_replace(trim(raw), '^[-*•]\s*', '') AS item FROM raw_excl
    WHERE  trim(COALESCE(raw,'')) <> ''
  ),
  deduped_incl AS (
    SELECT DISTINCT ON (lower(item)) item,
           row_number() OVER (ORDER BY lower(item)) AS rn
    FROM   cleaned_incl WHERE trim(item) <> ''
  ),
  deduped_excl AS (
    SELECT DISTINCT ON (lower(item)) item,
           row_number() OVER (ORDER BY lower(item)) AS rn
    FROM   cleaned_excl WHERE trim(item) <> ''
  ),
  agg_inc AS (SELECT COALESCE(array_agg(item ORDER BY rn), '{}') AS arr FROM deduped_incl WHERE rn <= 15),
  agg_exc AS (SELECT COALESCE(array_agg(item ORDER BY rn), '{}') AS arr FROM deduped_excl WHERE rn <= 15)
  SELECT (SELECT arr FROM agg_inc), (SELECT arr FROM agg_exc)
  INTO v_inclusions, v_exclusions;

  -- 3. Gallery: kit curator override + child main_image + images table, cap 12
  WITH items_ord AS (
    SELECT ii.id_product, ii.product_type,
           COALESCE(ii.day_number::int, 9999) AS day_num
    FROM   public.itinerary_items ii
    WHERE  ii.id_itinerary = v_itinerary_id
      AND  ii.account_id   = v_account_id
      AND  ii.id_product IS NOT NULL
      AND  ii.product_type IN ('Hoteles','Actividades','Transporte')
  ),
  pkg_gallery AS (
    SELECT g.val::text AS url, -1 AS day_num, ordinality - 1 AS order_idx, 0 AS prio
    FROM   public.package_kits pk,
           jsonb_array_elements_text(COALESCE(pk.program_gallery,'[]'::jsonb))
             WITH ORDINALITY AS g(val, ordinality)
    WHERE  pk.id = p_package_id AND btrim(g.val::text) <> ''
  ),
  child_main AS (
    SELECT COALESCE(h.main_image,'') AS url, it.day_num, 0 AS order_idx, 1 AS prio
    FROM public.hotels h JOIN items_ord it ON it.id_product = h.id WHERE it.product_type = 'Hoteles' AND COALESCE(h.main_image,'') <> ''
    UNION ALL
    SELECT COALESCE(a.main_image,'') AS url, it.day_num, 0 AS order_idx, 1 AS prio
    FROM public.activities a JOIN items_ord it ON it.id_product = a.id WHERE it.product_type = 'Actividades' AND COALESCE(a.main_image,'') <> ''
    UNION ALL
    SELECT COALESCE(t.main_image,'') AS url, it.day_num, 0 AS order_idx, 1 AS prio
    FROM public.transfers t JOIN items_ord it ON it.id_product = t.id WHERE it.product_type = 'Transporte' AND COALESCE(t.main_image,'') <> ''
  ),
  entity_imgs AS (
    SELECT img.url, it.day_num, COALESCE(img.order_index,99999) AS order_idx, 2 AS prio
    FROM public.images img JOIN items_ord it ON it.id_product = img.entity_id
    WHERE COALESCE(img.url,'') <> ''
  ),
  all_gallery AS (
    SELECT url, day_num, order_idx, prio FROM pkg_gallery
    UNION ALL SELECT url, day_num, order_idx, prio FROM child_main
    UNION ALL SELECT url, day_num, order_idx, prio FROM entity_imgs
  ),
  deduped_gallery AS (
    SELECT DISTINCT ON (url) url,
           row_number() OVER (ORDER BY prio, day_num, order_idx) AS rn
    FROM   all_gallery WHERE btrim(url) <> ''
    ORDER  BY url, prio, day_num, order_idx
  )
  SELECT COALESCE(array_agg(url ORDER BY rn), '{}')
  INTO   v_gallery
  FROM   deduped_gallery WHERE rn <= 12;

  RETURN jsonb_build_object(
    'inclusions', to_jsonb(COALESCE(v_inclusions,'{}'::text[])),
    'exclusions', to_jsonb(COALESCE(v_exclusions,'{}'::text[])),
    'gallery',    to_jsonb(COALESCE(v_gallery,   '{}'::text[]))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_package_aggregated_data(UUID) TO anon, authenticated;

-- Rollback: DROP FUNCTION IF EXISTS public.get_package_aggregated_data(UUID);
