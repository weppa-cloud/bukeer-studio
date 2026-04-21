-- ============================================================================
-- Editorial v1 — add `package_count` to get_website_destinations RPC
-- ============================================================================
-- Provenance:
--   The editorial v1 destinations grid renders two counters per card:
--     "N actividades" and "N paquetes".
--   The existing RPC surfaced `hotel_count` + `activity_count` but not
--   `package_count`, so the second line rendered as empty. This migration
--   extends the RPC with a fuzzy-match `package_count` per city.
--
-- Matching strategy:
--   `package_kits.destination` is free-form text (e.g. "Bogotá, Medellín,
--   Cartagena"). We lowercase + unaccent both sides and do a substring
--   match with ILIKE. The RPC city name is post-processed to drop the
--   trailing " de ..." segment (so "Cartagena de Indias" -> "cartagena")
--   unless the suffix is a distinguishing 2-word token (e.g. "Santa Marta"
--   kept intact).
--
-- Safety:
--   - Additive: new field `package_count` is appended; existing fields
--     preserved. Consumers that don't know about `package_count` ignore it.
--   - Idempotent: CREATE OR REPLACE FUNCTION.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_website_destinations(p_subdomain text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_wid UUID; v_aid UUID; v_fp JSONB;
  v_hotel_ids UUID[]; v_activity_ids UUID[]; v_package_ids UUID[];
  v_result JSONB := '[]'::jsonb;
  v_usd_rate NUMERIC := 1;
BEGIN
  SELECT w.id, w.account_id, COALESCE(w.featured_products,'{}'::jsonb)
  INTO v_wid, v_aid, v_fp
  FROM websites w WHERE w.subdomain=p_subdomain AND w.status='published' AND w.deleted_at IS NULL LIMIT 1;

  IF v_wid IS NULL THEN RETURN jsonb_build_object('destinations','[]'::jsonb); END IF;

  BEGIN
    SELECT (c->>'rate')::numeric INTO v_usd_rate
    FROM accounts a, jsonb_array_elements((to_jsonb(a)->>'currency')::jsonb) c
    WHERE a.id = v_aid AND c->>'name' = 'USD';
  EXCEPTION WHEN OTHERS THEN v_usd_rate := 1;
  END;
  IF v_usd_rate IS NULL OR v_usd_rate = 0 THEN v_usd_rate := 1; END IF;

  SELECT COALESCE(array_agg(x.value::uuid), ARRAY[]::uuid[]) INTO v_hotel_ids
  FROM jsonb_array_elements_text(COALESCE(v_fp->'hotels','[]'::jsonb)) x(value) WHERE x.value ~* '^[0-9a-f]{8}-';
  SELECT COALESCE(array_agg(x.value::uuid), ARRAY[]::uuid[]) INTO v_activity_ids
  FROM jsonb_array_elements_text(COALESCE(v_fp->'activities','[]'::jsonb)) x(value) WHERE x.value ~* '^[0-9a-f]{8}-';
  SELECT COALESCE(array_agg(x.value::uuid), ARRAY[]::uuid[]) INTO v_package_ids
  FROM jsonb_array_elements_text(COALESCE(v_fp->'packages','[]'::jsonb)) x(value) WHERE x.value ~* '^[0-9a-f]{8}-';

  SELECT COALESCE(jsonb_agg(row_to_json(d)::jsonb), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      city_name AS name,
      LOWER(REGEXP_REPLACE(unaccent(city_name), '[^a-zA-Z0-9]+', '-', 'g')) AS slug,
      city_state AS state,
      city_lat AS lat, city_lng AS lng,
      SUM(h_count)::int AS hotel_count,
      SUM(a_count)::int AS activity_count,
      -- package_count: fuzzy match against featured package_kits.destination.
      -- Trailing " de ..." suffix stripped; result used as needle in ILIKE.
      (
        SELECT COUNT(DISTINCT pk.id)::int
        FROM public.package_kits pk
        WHERE pk.account_id = v_aid
          AND pk.id = ANY(v_package_ids)
          AND LOWER(unaccent(COALESCE(pk.destination, ''))) ILIKE
              '%' || TRIM(REGEXP_REPLACE(LOWER(unaccent(city_name)), '\s+de\s+.+$', '', 'g')) || '%'
      ) AS package_count,
      (SUM(h_count) + SUM(a_count))::int AS total,
      CASE WHEN ROUND(MIN(NULLIF(min_p, 0)) * v_usd_rate) >= 1
        THEN '$' || ROUND(MIN(NULLIF(min_p, 0)) * v_usd_rate) || ' USD'
        ELSE NULL END AS min_price,
      COALESCE(
        MAX(CASE WHEN src = 'activity' THEN img END),
        MAX(CASE WHEN src = 'hotel' THEN img END)
      ) AS image
    FROM (
      SELECT
        COALESCE(NULLIF(trim(l.city), ''), l.name) AS city_name,
        l.state AS city_state,
        l.latitude AS city_lat,
        l.longitude AS city_lng,
        1 AS h_count, 0 AS a_count, 'hotel' AS src,
        COALESCE((SELECT MIN(hr.price) FROM hotel_rates hr WHERE hr.hotel_id = h.id AND hr.price > 0), 0) AS min_p,
        h.main_image AS img
      FROM hotels h
      JOIN locations l ON l.id::text = (to_jsonb(h)->>'location')
      WHERE h.account_id = v_aid AND h.id = ANY(v_hotel_ids) AND l.latitude IS NOT NULL

      UNION ALL

      SELECT
        COALESCE(NULLIF(trim(l.city), ''), l.name) AS city_name,
        l.state AS city_state,
        l.latitude AS city_lat,
        l.longitude AS city_lng,
        0 AS h_count, 1 AS a_count, 'activity' AS src,
        COALESCE((SELECT MIN(ar.price) FROM activities_rates ar WHERE ar.id_product = a.id AND ar.price > 0), 0) AS min_p,
        a.main_image AS img
      FROM activities a
      JOIN locations l ON l.id::text = (to_jsonb(a)->>'location')
      WHERE a.account_id = v_aid AND a.id = ANY(v_activity_ids) AND l.latitude IS NOT NULL
    ) products
    WHERE city_name IS NOT NULL AND city_name != ''
    GROUP BY city_name, city_state, city_lat, city_lng
    ORDER BY (SUM(h_count) + SUM(a_count)) DESC
  ) d;

  RETURN jsonb_build_object('destinations', v_result);
END;
$function$;

-- Rollback (restore pre-editorial-v1 RPC):
--   Run the previous version of get_website_destinations which omits
--   v_package_ids / package_count. See git history for the prior body.
