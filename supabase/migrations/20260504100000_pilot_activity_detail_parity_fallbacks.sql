-- ============================================================================
-- EPIC #250 / Pilot parity — Activity detail P1 gap closure.
--
-- Problem: `get_website_product_page` (activity branch) only returns
-- `schedule`, `meeting_point`, `photos`, `highlights`, `options`, `social_image`
-- when the account has an `account_activities` + `master_activities` overlay
-- row. Pilot activities (and any Flutter-owner activity with only legacy /
-- program_* columns) return NULL for those fields, so the Studio renderer
-- silently skips ProgramTimeline, MeetingPointMap, gallery-strip, and the
-- highlights grid.
--
-- Fix: add direct-from-`activities` fallbacks when `aa.id IS NULL`, preserving
-- the master-overlay precedence when it exists. Sources of truth (in order):
--   - schedule      → a.schedule_data (jsonb[])
--   - meeting_point → a.metadata->'meeting_point'
--   - highlights    → a.program_highlights
--   - photos        → a.program_gallery
--   - social_image  → a.social_image → a.main_image → a.cover_image_url
--   - image         → same COALESCE chain as above (already handled)
--   - duration      → derived "Xh Ym" string from a.duration_minutes (for
--                     chip rendering — matrix row #5)
--
-- Activity options (matrix row #34) remain gated behind `aa.id IS NOT NULL`
-- because `activity_options` + `activity_prices` live under the account-overlay
-- model; partners without a master overlay keep the row hidden (matches
-- current ADR-025 ownership boundary).
--
-- Idempotent: CREATE OR REPLACE FUNCTION is safe to re-run.
-- ============================================================================

create or replace function public.get_website_product_page(
  p_subdomain text,
  p_product_type text,
  p_product_slug text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_website_id UUID;
  v_account_id UUID;
  v_product_id UUID;
  v_package_kit_id UUID;
  v_product_type TEXT := lower(COALESCE(trim(p_product_type), ''));
  v_product_slug TEXT := lower(COALESCE(trim(p_product_slug), ''));
  v_product_data JSONB;
  v_page_data JSONB;
  v_min_price NUMERIC;
  v_currency TEXT;
BEGIN
  SELECT w.id, w.account_id
  INTO v_website_id, v_account_id
  FROM public.websites w
  WHERE w.subdomain = p_subdomain
    AND w.status = 'published'
    AND w.deleted_at IS NULL
  LIMIT 1;

  IF v_website_id IS NULL OR v_account_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_product_type IN ('hotels', 'hotel') THEN
    v_product_type := 'hotel';
  ELSIF v_product_type IN ('activities', 'activity') THEN
    v_product_type := 'activity';
  ELSIF v_product_type IN ('transfers', 'transfer') THEN
    v_product_type := 'transfer';
  ELSIF v_product_type IN ('packages', 'package') THEN
    v_product_type := 'package';
  END IF;

  IF v_product_type = 'hotel' THEN
    SELECT
      h.id,
      jsonb_strip_nulls(
        jsonb_build_object(
          'id', h.id,
          'name', h.name,
          'slug', COALESCE(NULLIF(h.slug, ''), public.website_slugify(h.name)),
          'description', COALESCE(h.description, h.description_short),
          'image', COALESCE(h.main_image, h.social_image, h.pdf_image),
          'images', public.website_collect_entity_images(
            h.id,
            v_account_id,
            COALESCE(h.main_image, h.social_image, h.pdf_image)
          ),
          'location', COALESCE(l.name, h.location::text),
          'type', 'hotel',
          'amenities', COALESCE(to_jsonb(h.amenities), '[]'::jsonb),
          'star_rating', COALESCE(h.star_rating, 0),
          'inclusions', COALESCE(h.inclutions, ''),
          'exclusions', COALESCE(h.exclutions, ''),
          'recommendations', COALESCE(h.recomendations, ''),
          'amenities_v2', CASE
            WHEN ah.id IS NOT NULL THEN COALESCE(to_jsonb(mh)->'amenities', '[]'::jsonb)
            ELSE NULL
          END,
          'photos', CASE
            WHEN ah.id IS NOT NULL THEN COALESCE(to_jsonb(mh)->'photos', '[]'::jsonb)
            ELSE NULL
          END,
          'social_image', CASE
            WHEN ah.id IS NOT NULL THEN COALESCE(
              NULLIF(to_jsonb(mh)->>'social_image', ''),
              NULLIF(h.social_image, ''),
              NULLIF(h.main_image, ''),
              NULLIF(h.pdf_image, '')
            )
            ELSE NULL
          END,
          'latitude', CASE
            WHEN ah.id IS NOT NULL AND (to_jsonb(mh)->>'latitude') ~ '^-?[0-9]+(\.[0-9]+)?$'
              THEN (to_jsonb(mh)->>'latitude')::numeric
            ELSE NULL
          END,
          'longitude', CASE
            WHEN ah.id IS NOT NULL AND (to_jsonb(mh)->>'longitude') ~ '^-?[0-9]+(\.[0-9]+)?$'
              THEN (to_jsonb(mh)->>'longitude')::numeric
            ELSE NULL
          END,
          'user_rating', CASE
            WHEN ah.id IS NOT NULL AND (to_jsonb(mh)->>'user_rating') ~ '^-?[0-9]+(\.[0-9]+)?$'
              THEN (to_jsonb(mh)->>'user_rating')::numeric
            ELSE NULL
          END,
          'review_count', CASE
            WHEN ah.id IS NOT NULL AND (to_jsonb(mh)->>'review_count') ~ '^[0-9]+$'
              THEN (to_jsonb(mh)->>'review_count')::bigint
            ELSE NULL
          END
        )
      )
    INTO v_product_id, v_product_data
    FROM public.hotels h
    LEFT JOIN public.locations l ON l.id = h.location
    LEFT JOIN public.account_hotels ah
      ON ah.account_id = v_account_id
      AND ah.legacy_hotel_id = h.id
      AND ah.is_active = true
    LEFT JOIN public.master_hotels mh ON mh.id = ah.master_hotel_id
    WHERE h.account_id = v_account_id
      AND h.deleted_at IS NULL
      AND (
        lower(COALESCE(h.slug, '')) = v_product_slug
        OR (
          (h.slug IS NULL OR btrim(h.slug) = '')
          AND lower(public.website_slugify(h.name)) = v_product_slug
        )
      )
    LIMIT 1;

    IF v_product_id IS NOT NULL THEN
      SELECT MIN(hr.price), COALESCE(MIN(hr.currency), 'USD')
      INTO v_min_price, v_currency
      FROM public.hotel_rates hr
      WHERE hr.hotel_id = v_product_id
        AND hr.price IS NOT NULL
        AND hr.price > 0;

      IF v_min_price IS NOT NULL THEN
        v_product_data := v_product_data
          || jsonb_build_object('price', v_min_price, 'currency', COALESCE(v_currency, 'USD'));
      END IF;
    END IF;

  ELSIF v_product_type = 'activity' THEN
    SELECT
      a.id,
      jsonb_strip_nulls(
        jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'slug', COALESCE(NULLIF(a.slug, ''), public.website_slugify(a.name)),
          'description', COALESCE(a.description, a.description_short),
          'image', COALESCE(a.main_image, a.social_image, a.cover_image_url),
          'images', public.website_collect_entity_images(
            a.id,
            v_account_id,
            COALESCE(a.main_image, a.social_image, a.cover_image_url)
          ),
          'location', COALESCE(l.name, a.location::text),
          'type', 'activity',
          'duration', CASE
            WHEN COALESCE(a.duration_minutes, 0) >= 60 THEN
              format('%sh %sm',
                (a.duration_minutes / 60)::int,
                (a.duration_minutes % 60)::int
              )
            WHEN COALESCE(a.duration_minutes, 0) > 0 THEN
              format('%s min', a.duration_minutes)
            ELSE NULL
          END,
          'inclusions', CASE
            WHEN aa.id IS NOT NULL THEN COALESCE(to_jsonb(ma)->'inclusions', '[]'::jsonb)
            WHEN jsonb_typeof(a.program_inclusions) = 'array'
                 AND jsonb_array_length(a.program_inclusions) > 0
              THEN a.program_inclusions
            ELSE to_jsonb(COALESCE(a.inclutions, ''))
          END,
          'exclusions', CASE
            WHEN aa.id IS NOT NULL THEN COALESCE(to_jsonb(ma)->'exclusions', '[]'::jsonb)
            WHEN jsonb_typeof(a.program_exclusions) = 'array'
                 AND jsonb_array_length(a.program_exclusions) > 0
              THEN a.program_exclusions
            ELSE to_jsonb(COALESCE(a.exclutions, ''))
          END,
          'recommendations', COALESCE(
            NULLIF(a.program_notes, ''),
            a.recomendations,
            ''
          ),
          'instructions', COALESCE(
            NULLIF(a.program_meeting_info, ''),
            a.instructions,
            ''
          ),
          'duration_minutes', COALESCE(a.duration_minutes, 0),
          -- schedule: master overlay wins; else fall back to legacy
          -- `schedule_data` jsonb[] column (Flutter admin owner).
          'schedule', CASE
            WHEN aa.id IS NOT NULL
              THEN COALESCE(to_jsonb(ma)->'schedule', '[]'::jsonb)
            WHEN a.schedule_data IS NOT NULL
                 AND array_length(a.schedule_data, 1) > 0
              THEN to_jsonb(a.schedule_data)
            ELSE NULL
          END,
          -- meeting_point: master overlay wins; else fall back to
          -- `a.metadata->'meeting_point'` (Flutter map-picker writes here).
          'meeting_point', CASE
            WHEN aa.id IS NOT NULL THEN to_jsonb(ma)->'meeting_point'
            WHEN a.metadata IS NOT NULL AND a.metadata ? 'meeting_point'
              THEN a.metadata->'meeting_point'
            ELSE NULL
          END,
          'highlights', CASE
            WHEN aa.id IS NOT NULL THEN COALESCE(to_jsonb(ma)->'highlights', '[]'::jsonb)
            WHEN jsonb_typeof(a.program_highlights) = 'array'
                 AND jsonb_array_length(a.program_highlights) > 0
              THEN a.program_highlights
            ELSE NULL
          END,
          'photos', CASE
            WHEN aa.id IS NOT NULL THEN COALESCE(to_jsonb(ma)->'photos', '[]'::jsonb)
            WHEN jsonb_typeof(a.program_gallery) = 'array'
                 AND jsonb_array_length(a.program_gallery) > 0
              THEN a.program_gallery
            ELSE NULL
          END,
          'social_image', CASE
            WHEN aa.id IS NOT NULL THEN COALESCE(
              NULLIF(to_jsonb(ma)->>'social_image', ''),
              NULLIF(a.social_image, ''),
              NULLIF(a.main_image, '')
            )
            ELSE COALESCE(
              NULLIF(a.social_image, ''),
              NULLIF(a.main_image, ''),
              NULLIF(a.cover_image_url, '')
            )
          END,
          'latitude', CASE
            WHEN aa.id IS NOT NULL AND (to_jsonb(ma)->>'latitude') ~ '^-?[0-9]+(\.[0-9]+)?$'
              THEN (to_jsonb(ma)->>'latitude')::numeric
            ELSE NULL
          END,
          'longitude', CASE
            WHEN aa.id IS NOT NULL AND (to_jsonb(ma)->>'longitude') ~ '^-?[0-9]+(\.[0-9]+)?$'
              THEN (to_jsonb(ma)->>'longitude')::numeric
            ELSE NULL
          END,
          'user_rating', CASE
            WHEN aa.id IS NOT NULL THEN COALESCE(
              CASE WHEN (to_jsonb(ma)->>'user_rating') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(ma)->>'user_rating')::numeric END,
              CASE WHEN (to_jsonb(a)->>'rating') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(a)->>'rating')::numeric END,
              CASE WHEN (to_jsonb(a)->>'user_rating') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(a)->>'user_rating')::numeric END
            )
            ELSE NULL
          END,
          'review_count', CASE
            WHEN aa.id IS NOT NULL THEN COALESCE(
              CASE WHEN (to_jsonb(ma)->>'review_count') ~ '^[0-9]+$' THEN (to_jsonb(ma)->>'review_count')::bigint END,
              CASE WHEN (to_jsonb(a)->>'review_count') ~ '^[0-9]+$' THEN (to_jsonb(a)->>'review_count')::bigint END
            )
            ELSE NULL
          END,
          'experience_type', CASE
            WHEN aa.id IS NOT NULL THEN NULLIF(to_jsonb(ma)->>'experience_type', '')
            ELSE NULLIF(a.experience_type, '')
          END,
          'activity_type', CASE
            WHEN aa.id IS NOT NULL THEN NULLIF(to_jsonb(ma)->>'activity_type', '')
            ELSE NULL
          END,
          'region', CASE
            WHEN aa.id IS NOT NULL THEN NULLIF(to_jsonb(ma)->>'region', '')
            ELSE NULL
          END,
          'options', CASE
            WHEN aa.id IS NOT NULL THEN COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', ao.id::text,
                  'name', ao.name,
                  'pricing_per', ao.pricing_per,
                  'min_units', ao.min_units,
                  'max_units', ao.max_units,
                  'start_times', COALESCE(ao.start_times, '[]'::jsonb),
                  'is_refundable', ao.is_refundable,
                  'prices', COALESCE((
                    SELECT jsonb_agg(
                      jsonb_build_object(
                        'unit_type_code', ap.unit_type_code,
                        'season', ap.season,
                        'price', ap.price,
                        'currency', ap.currency,
                        'valid_from', ap.valid_from,
                        'valid_until', ap.valid_until
                      )
                      ORDER BY ap.valid_from, ap.unit_type_code
                    )
                    FROM public.activity_prices ap
                    WHERE ap.option_id = ao.id
                      AND ap.is_active = true
                  ), '[]'::jsonb)
                )
                ORDER BY ao.sort_order, ao.name
              )
              FROM public.activity_options ao
              WHERE ao.account_activity_id = aa.id
                AND ao.is_active = true
            ), '[]'::jsonb)
            ELSE NULL
          END
        )
      )
    INTO v_product_id, v_product_data
    FROM public.activities a
    LEFT JOIN public.locations l ON l.id = a.location
    LEFT JOIN public.account_activities aa
      ON aa.account_id = v_account_id
      AND aa.legacy_activity_id = a.id
      AND aa.is_active = true
    LEFT JOIN public.master_activities ma ON ma.id = aa.master_activity_id
    WHERE a.account_id = v_account_id
      AND a.deleted_at IS NULL
      AND (
        lower(COALESCE(a.slug, '')) = v_product_slug
        OR (
          (a.slug IS NULL OR btrim(a.slug) = '')
          AND lower(public.website_slugify(a.name)) = v_product_slug
        )
      )
    LIMIT 1;

    IF v_product_id IS NOT NULL THEN
      SELECT MIN(ar.price)
      INTO v_min_price
      FROM public.activities_rates ar
      WHERE ar.id_product = v_product_id
        AND ar.price IS NOT NULL
        AND ar.price > 0;

      IF v_min_price IS NOT NULL THEN
        v_product_data := v_product_data
          || jsonb_build_object('price', v_min_price, 'currency', 'USD');
      END IF;
    END IF;

  ELSIF v_product_type = 'transfer' THEN
    SELECT
      t.id,
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'slug', COALESCE(NULLIF(t.slug, ''), public.website_slugify(t.name)),
        'description', COALESCE(t.description, t.description_short),
        'image', t.main_image,
        'images', public.website_collect_entity_images(t.id, v_account_id, t.main_image),
        'location', COALESCE(l.name, t.location::text),
        'type', 'transfer',
        'inclusions', COALESCE(t.inclutions, ''),
        'exclusions', COALESCE(t.exclutions, ''),
        'recommendations', COALESCE(t.recomendations, ''),
        'from_location', COALESCE(t.from_location, ''),
        'to_location', COALESCE(t.to_location, '')
      )
    INTO v_product_id, v_product_data
    FROM public.transfers t
    LEFT JOIN public.locations l ON l.id = t.location
    WHERE t.account_id = v_account_id
      AND t.deleted_at IS NULL
      AND (
        lower(COALESCE(t.slug, '')) = v_product_slug
        OR (
          (t.slug IS NULL OR btrim(t.slug) = '')
          AND lower(public.website_slugify(t.name)) = v_product_slug
        )
      )
    LIMIT 1;

  ELSIF v_product_type = 'package' THEN
    SELECT
      i.id,
      pk.id,
      jsonb_strip_nulls(
        jsonb_build_object(
          'id', i.id,
          'name', i.name,
          'slug', COALESCE(NULLIF(to_jsonb(pk)->>'slug', ''), public.website_slugify(i.name)),
          'description', COALESCE(pk.description, i.personalized_message, ''),
          'image', COALESCE(pk.cover_image_url, i.main_image),
          'images', public.website_collect_entity_images(
            i.id,
            v_account_id,
            COALESCE(pk.cover_image_url, i.main_image)
          ),
          'type', 'package',
          'destination', NULLIF(pk.destination, ''),
          'price', CASE
            WHEN i.total_amount > 0 THEN i.total_amount
            WHEN pkv.total_price > 0 THEN pkv.total_price
            ELSE NULL
          END,
          'currency', COALESCE(
            NULLIF(pkv.base_currency, ''),
            NULLIF(pkv.snapshot_currency, ''),
            'USD'
          ),
          'services_snapshot_summary', CASE
            WHEN pkv.id IS NULL THEN NULL
            ELSE format(
              '%s services',
              COALESCE(jsonb_array_length(COALESCE(pkv.services_snapshot, '[]'::jsonb)), 0)
            )
          END,
          'duration_days', pk.duration_days,
          'duration_nights', pk.duration_nights,
          -- Package gallery parity: expose `program_gallery` so GalleryStrip
          -- can render 1-main + 4-thumbs. Legacy callers already fall back to
          -- `images` / `image`.
          'program_gallery', CASE
            WHEN jsonb_typeof(pk.program_gallery) = 'array'
                 AND jsonb_array_length(pk.program_gallery) > 0
              THEN pk.program_gallery
            ELSE NULL
          END,
          'itinerary_items', COALESCE(
            (
              WITH svc AS (
                SELECT
                  COALESCE(NULLIF((elem->>'day_number'), '')::int, 0) AS day,
                  NULLIF(trim(elem->>'product_name'), '') AS product_name,
                  lower(COALESCE(elem->>'product_type', '')) AS product_type,
                  NULLIF(trim(elem->>'destination'), '') AS destination,
                  COALESCE((elem->>'seq')::int, 0) AS seq
                FROM jsonb_array_elements(COALESCE(pkv.services_snapshot, '[]'::jsonb)) AS elem
                WHERE COALESCE(elem->>'product_name', '') <> ''
              ),
              has_days AS (
                SELECT bool_or(day > 0) AS any_day FROM svc
              ),
              grouped_real AS (
                SELECT
                  s.day,
                  (
                    SELECT string_agg(DISTINCT cat, ' + ' ORDER BY cat)
                    FROM (
                      SELECT CASE s2.product_type
                        WHEN 'hotels'     THEN 'Hotel'
                        WHEN 'activities' THEN 'Actividad'
                        WHEN 'transfers'  THEN 'Traslado'
                        WHEN 'flights'    THEN 'Vuelo'
                        ELSE initcap(s2.product_type)
                      END AS cat
                      FROM svc s2
                      WHERE s2.day = s.day
                    ) c
                  ) AS title,
                  (
                    SELECT string_agg(DISTINCT s3.product_name, ', ')
                    FROM svc s3
                    WHERE s3.day = s.day
                      AND s3.product_name IS NOT NULL
                  ) AS description,
                  -- Map first product_type to canonical ScheduleEventType so
                  -- the renderer can pick the right variant (hotel card,
                  -- flight-row, transfer-row) without re-inferring from text.
                  (
                    SELECT CASE s4.product_type
                      WHEN 'hotels'     THEN 'lodging'
                      WHEN 'activities' THEN 'activity'
                      WHEN 'transfers'  THEN 'transport'
                      WHEN 'flights'    THEN 'flight'
                      ELSE 'activity'
                    END
                    FROM svc s4
                    WHERE s4.day = s.day
                    ORDER BY CASE s4.product_type
                      WHEN 'flights'    THEN 1
                      WHEN 'transfers'  THEN 2
                      WHEN 'activities' THEN 3
                      WHEN 'hotels'     THEN 4
                      ELSE 5
                    END, s4.seq
                    LIMIT 1
                  ) AS event_type
                FROM svc s, has_days
                WHERE has_days.any_day = true AND s.day > 0
                GROUP BY s.day
                ORDER BY s.day
              ),
              grouped_synthetic AS (
                SELECT
                  gs.day,
                  format('Día %s', gs.day) AS title,
                  NULL::text AS description,
                  'activity'::text AS event_type
                FROM has_days h
                CROSS JOIN generate_series(1, GREATEST(COALESCE(pk.duration_days, 0), 0)) AS gs(day)
                WHERE h.any_day = false
              ),
              merged AS (
                SELECT day, title, description, event_type FROM grouped_real
                UNION ALL
                SELECT day, title, description, event_type FROM grouped_synthetic
              )
              SELECT jsonb_agg(
                jsonb_build_object(
                  'day', m.day,
                  'title', m.title,
                  'description', m.description,
                  'event_type', m.event_type
                )
                ORDER BY m.day
              )
              FROM merged m
            ),
            '[]'::jsonb
          ),
          'inclusions', COALESCE(
            (
              WITH ranked AS (
                SELECT DISTINCT ON (trim(elem->>'product_name'))
                  trim(elem->>'product_name') AS product_name,
                  CASE lower(COALESCE(elem->>'product_type', ''))
                    WHEN 'hotels'     THEN 1
                    WHEN 'activities' THEN 2
                    WHEN 'transfers'  THEN 3
                    WHEN 'flights'    THEN 4
                    ELSE 5
                  END AS prio,
                  COALESCE((elem->>'seq')::int, 0) AS seq
                FROM jsonb_array_elements(COALESCE(pkv.services_snapshot, '[]'::jsonb)) AS elem
                WHERE COALESCE(trim(elem->>'product_name'), '') <> ''
                ORDER BY trim(elem->>'product_name'), prio, seq
              )
              SELECT jsonb_agg(r.product_name ORDER BY r.prio, r.seq, r.product_name)
              FROM ranked r
            ),
            '[]'::jsonb
          ),
          'highlights', COALESCE(
            (
              WITH parsed AS (
                SELECT
                  trim(both ' \t' FROM
                    regexp_replace(line, '^\s*(?:[-•]\s*)', '', 'g')
                  ) AS bullet
                FROM regexp_split_to_table(COALESCE(pk.description, ''), E'\\r?\\n') AS line
                WHERE line ~ '^\s*[-•]\s+\S'
              ),
              filtered AS (
                SELECT bullet
                FROM parsed
                WHERE bullet IS NOT NULL AND length(bullet) > 0
                LIMIT 6
              ),
              auto_cats AS (
                SELECT
                  CASE lower(COALESCE(elem->>'product_type', ''))
                    WHEN 'hotels' THEN format(
                      '%s %s de alojamiento',
                      COALESCE(NULLIF(pk.duration_nights, 0), 1),
                      CASE WHEN COALESCE(pk.duration_nights, 1) = 1 THEN 'noche' ELSE 'noches' END
                    )
                    WHEN 'activities' THEN format(
                      '%s actividades incluidas',
                      COUNT(*) OVER (PARTITION BY lower(COALESCE(elem->>'product_type', '')))
                    )
                    WHEN 'transfers' THEN 'Traslados incluidos'
                    WHEN 'flights' THEN 'Vuelos incluidos'
                    ELSE NULL
                  END AS h,
                  CASE lower(COALESCE(elem->>'product_type', ''))
                    WHEN 'hotels'     THEN 1
                    WHEN 'activities' THEN 2
                    WHEN 'transfers'  THEN 3
                    WHEN 'flights'    THEN 4
                    ELSE 5
                  END AS prio
                FROM jsonb_array_elements(COALESCE(pkv.services_snapshot, '[]'::jsonb)) AS elem
                WHERE COALESCE(trim(elem->>'product_name'), '') <> ''
              ),
              auto_distinct AS (
                SELECT h, MIN(prio) AS prio
                FROM auto_cats
                WHERE h IS NOT NULL
                GROUP BY h
                ORDER BY MIN(prio)
                LIMIT 3
              )
              SELECT CASE
                WHEN EXISTS (SELECT 1 FROM filtered)
                  THEN (SELECT jsonb_agg(bullet) FROM filtered)
                ELSE (SELECT jsonb_agg(h ORDER BY prio) FROM auto_distinct)
              END
            ),
            '[]'::jsonb
          ),
          'program_notes', NULL
        )
      )
    INTO v_product_id, v_package_kit_id, v_product_data
    FROM public.itineraries i
    LEFT JOIN LATERAL (
      SELECT pk0.*
      FROM public.package_kits pk0
      WHERE pk0.account_id = v_account_id
        AND (
          pk0.id = i.source_package_id
          OR pk0.source_itinerary_id = i.id
        )
      ORDER BY
        CASE WHEN pk0.id = i.source_package_id THEN 0 ELSE 1 END,
        pk0.updated_at DESC
      LIMIT 1
    ) pk ON true
    LEFT JOIN LATERAL (
      SELECT pv.*
      FROM public.package_kit_versions pv
      WHERE pv.package_kit_id = pk.id
        AND pv.is_active = true
      ORDER BY
        CASE
          WHEN pv.id = i.source_package_version_id THEN 0
          WHEN pv.is_base_version = true THEN 1
          ELSE 2
        END,
        pv.version_number DESC
      LIMIT 1
    ) pkv ON true
    WHERE i.account_id = v_account_id
      AND i.deleted_at IS NULL
      AND (
        lower(COALESCE(to_jsonb(pk)->>'slug', '')) = v_product_slug
        OR lower(public.website_slugify(i.name)) = v_product_slug
      )
    LIMIT 1;

  ELSE
    RETURN NULL;
  END IF;

  IF v_product_id IS NULL OR v_product_data IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_strip_nulls(jsonb_build_object(
    'id', pp.id,
    'custom_hero', pp.custom_hero,
    'custom_sections', pp.custom_sections,
    'sections_order', pp.sections_order,
    'hidden_sections', pp.hidden_sections,
    'custom_seo_title', pp.custom_seo_title,
    'custom_seo_description', pp.custom_seo_description,
    'robots_noindex', CASE
      WHEN (to_jsonb(pp)->>'robots_noindex') IN ('true', 'false')
        THEN (to_jsonb(pp)->>'robots_noindex')::boolean
      ELSE NULL
    END,
    'custom_faq', COALESCE(to_jsonb(pp)->'custom_faq', '[]'::jsonb),
    'custom_highlights', COALESCE(to_jsonb(pp)->'custom_highlights', '[]'::jsonb),
    'is_published', pp.is_published
  ))
  INTO v_page_data
  FROM public.website_product_pages pp
  WHERE pp.website_id = v_website_id
    AND pp.product_type = v_product_type
    AND pp.is_published = true
    AND (
      (v_product_type <> 'package' AND pp.product_id = v_product_id)
      OR (
        v_product_type = 'package'
        AND (
          pp.product_id = v_product_id
          OR (v_package_kit_id IS NOT NULL AND pp.product_id = v_package_kit_id)
        )
      )
    )
  LIMIT 1;

  IF v_page_data IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'product', v_product_data,
    'page', v_page_data
  );
END;
$function$;

comment on function public.get_website_product_page(text, text, text) is
  'Website SSR product-page RPC. Activity branch now falls back to direct `activities` columns '
  || '(schedule_data, program_highlights, program_gallery, metadata->meeting_point, legacy '
  || '`recomendations`/`instructions`) when no account_activities master overlay exists — '
  || 'closes pilot parity P1 gaps (#250). Package branch now emits `program_gallery` + '
  || '`event_type` per itinerary day so day-by-day variants render without text inference.';
