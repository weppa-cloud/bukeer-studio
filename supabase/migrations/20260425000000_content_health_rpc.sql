-- ============================================================================
-- Issue #192 (child of #190) — Phase 0.5: Content Health RPCs
--
-- SCORE FORMULA
--   Required fields (40 pts):
--     name, description ≥80ch, image, price, slug → 8 pts c/u
--   Marketing fields (30 pts):
--     highlights, inclusions, exclusions, gallery ≥2, video → 6 pts c/u
--   SEO fields (15 pts):
--     custom_seo_title, custom_seo_description, social_image → 5 pts c/u
--   Ghost penalty: -2 pts per ghost (max -20)
--   AI locked bonus: +0.5 pt per locked field (max +5)
--   Clamp [0, 100]
--
-- TENANCY (ADR-005): SECURITY DEFINER + explicit account_id check. No auth.uid().
-- ============================================================================

-- ─── Scalar function: compute_content_health_score ──────────────────────────

CREATE OR REPLACE FUNCTION public.compute_content_health_score(
  p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id    UUID;
  v_product       RECORD;
  v_page          RECORD;
  v_score         INT := 0;
  v_ghosts        JSONB := '[]'::jsonb;
  v_ai_fields     JSONB := '[]'::jsonb;
  v_fallbacks     JSONB := '[]'::jsonb;
  v_computed      JSONB := '[]'::jsonb;
  v_ghost_count   INT := 0;
  v_ai_locked     INT := 0;
BEGIN
  -- 1. Load product + tenancy
  SELECT p.id, p.account_id, p.type, p.name, p.slug, p.description, p.image,
         p.price, p.video_url, p.highlights, p.photos,
         p.inclusions, p.exclusions
  INTO   v_product
  FROM   public.products p
  WHERE  p.id = p_product_id
  LIMIT  1;

  IF v_product IS NULL THEN
    RETURN jsonb_build_object(
      'product_id', p_product_id,
      'product_type', 'activity',
      'score', 0,
      'ghosts', '[]'::jsonb,
      'ai_fields', '[]'::jsonb,
      'fallbacks', '[]'::jsonb,
      'computed', '[]'::jsonb,
      'last_computed_at', now()
    );
  END IF;

  v_account_id := v_product.account_id;

  -- 2. Load page customization (optional)
  SELECT ppc.custom_seo_title, ppc.custom_seo_description, ppc.custom_hero,
         ppc.custom_faq, ppc.custom_highlights, ppc.hidden_sections
  INTO   v_page
  FROM   public.product_page_customizations ppc
  WHERE  ppc.product_id = p_product_id
  LIMIT  1;

  -- 3. Required fields (40 pts — 8 each)
  IF COALESCE(v_product.name,'') <> '' THEN v_score := v_score + 8; END IF;
  IF COALESCE(length(v_product.description),0) >= 80 THEN
    v_score := v_score + 8;
  ELSE
    v_ghosts := v_ghosts || jsonb_build_object(
      'section', 'description',
      'label', 'Descripción',
      'reason', 'threshold_not_met',
      'cta', jsonb_build_object('label','Editar descripción','anchor','#editor-description')
    );
    v_ghost_count := v_ghost_count + 1;
  END IF;
  IF COALESCE(v_product.image,'') <> '' THEN v_score := v_score + 8; END IF;
  IF v_product.price IS NOT NULL AND v_product.price > 0 THEN v_score := v_score + 8; END IF;
  IF COALESCE(v_product.slug,'') <> '' THEN v_score := v_score + 8; END IF;

  -- 4. Marketing fields (30 pts — 6 each)
  IF (v_page.custom_highlights IS NOT NULL AND jsonb_array_length(v_page.custom_highlights) > 0)
     OR (v_product.highlights IS NOT NULL AND jsonb_array_length(v_product.highlights) > 0) THEN
    v_score := v_score + 6;
  ELSE
    v_ghosts := v_ghosts || jsonb_build_object(
      'section', 'highlights', 'label','Highlights','reason','empty',
      'cta', jsonb_build_object('label','Agregar highlights','anchor','#editor-highlights')
    );
    v_ghost_count := v_ghost_count + 1;
  END IF;

  IF v_product.inclusions IS NOT NULL THEN
    v_score := v_score + 6;
  ELSE
    v_ghosts := v_ghosts || jsonb_build_object(
      'section','inclusions','label','Inclusiones','reason','empty',
      'cta', jsonb_build_object('label','Agregar inclusiones','anchor','#editor-inclusions')
    );
    v_ghost_count := v_ghost_count + 1;
  END IF;

  IF v_product.exclusions IS NOT NULL THEN
    v_score := v_score + 6;
  ELSE
    v_ghosts := v_ghosts || jsonb_build_object(
      'section','exclusions','label','Exclusiones','reason','empty',
      'cta', jsonb_build_object('label','Agregar exclusiones','anchor','#editor-exclusions')
    );
    v_ghost_count := v_ghost_count + 1;
  END IF;

  IF v_product.photos IS NOT NULL AND jsonb_array_length(v_product.photos) >= 2 THEN
    v_score := v_score + 6;
  ELSE
    v_ghosts := v_ghosts || jsonb_build_object(
      'section','gallery','label','Galería','reason','threshold_not_met',
      'cta', jsonb_build_object('label','Subir imágenes','anchor','#editor-gallery')
    );
    v_ghost_count := v_ghost_count + 1;
  END IF;

  IF COALESCE(v_product.video_url,'') <> '' THEN
    v_score := v_score + 6;
  ELSE
    v_ghosts := v_ghosts || jsonb_build_object(
      'section','video','label','Video','reason','empty',
      'cta', jsonb_build_object('label','Agregar URL del video','anchor','#editor-video')
    );
    v_ghost_count := v_ghost_count + 1;
  END IF;

  -- 5. SEO fields (15 pts — 5 each)
  IF COALESCE(v_page.custom_seo_title,'') <> '' THEN v_score := v_score + 5; END IF;
  IF COALESCE(v_page.custom_seo_description,'') <> '' THEN v_score := v_score + 5; END IF;
  -- social_image proxy via image
  IF COALESCE(v_product.image,'') <> '' THEN v_score := v_score + 5; END IF;

  -- 6. Ghost penalty (capped -20)
  v_score := v_score - LEAST(v_ghost_count * 2, 20);

  -- 7. Computed fields always present
  v_computed := '["breadcrumb","similar_products","rating_badge"]'::jsonb;

  -- 8. Fallbacks (heuristic — more work in Phase 2)
  IF v_page.custom_faq IS NULL OR jsonb_array_length(v_page.custom_faq) = 0 THEN
    v_fallbacks := v_fallbacks || '"faq_default"'::jsonb;
  END IF;

  -- 9. AI fields (placeholder — full wiring Phase 2)
  IF v_product.type = 'package' THEN
    v_ai_fields := '[
      {"field":"highlights","locked":false,"generated_at":null,"hash":null},
      {"field":"description","locked":false,"generated_at":null,"hash":null}
    ]'::jsonb;
  END IF;

  -- 10. Clamp + return
  v_score := GREATEST(0, LEAST(100, v_score));

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'product_type', v_product.type,
    'score', v_score,
    'ghosts', v_ghosts,
    'ai_fields', v_ai_fields,
    'fallbacks', v_fallbacks,
    'computed', v_computed,
    'last_computed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_content_health_score(UUID) TO anon, authenticated;

-- ─── RPC: get_product_content_health ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_product_content_health(
  p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := public.compute_content_health_score(p_product_id);
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_content_health(UUID) TO anon, authenticated;

-- ─── RPC: list_products_content_health ──────────────────────────────────────
-- Paginated aggregated list for dashboard. Computes score per-product inline.
-- Phase 0.5: on-demand compute. Phase 2 optimization: materialized view refresh
-- via pg_cron. Tracked in issue body (R2).

CREATE OR REPLACE FUNCTION public.list_products_content_health(
  p_website_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_min_score INT DEFAULT NULL,
  p_max_score INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_items      JSONB := '[]'::jsonb;
  v_total      INT := 0;
  v_limit      INT := GREATEST(1, LEAST(p_limit, 100));
  v_offset     INT := GREATEST(0, p_offset);
BEGIN
  SELECT w.account_id INTO v_account_id
  FROM   public.websites w
  WHERE  w.id = p_website_id
  LIMIT  1;

  IF v_account_id IS NULL THEN
    RETURN jsonb_build_object('items','[]'::jsonb,'total',0,'limit',v_limit,'offset',v_offset);
  END IF;

  WITH scored AS (
    SELECT p.id, p.name, p.slug, p.type,
           (public.compute_content_health_score(p.id)) AS health
    FROM   public.products p
    WHERE  p.account_id = v_account_id
    ORDER  BY p.name
  ),
  filtered AS (
    SELECT s.id, s.name, s.slug, s.type,
           (s.health->>'score')::int AS score,
           jsonb_array_length(COALESCE(s.health->'ghosts','[]'::jsonb)) AS ghosts_count,
           (
             SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(s.health->'ai_fields','[]'::jsonb)) AS a
             WHERE  (a->>'locked')::boolean = false
           ) AS ai_unlocked_count,
           jsonb_array_length(COALESCE(s.health->'fallbacks','[]'::jsonb)) AS fallbacks_count,
           (s.health->>'last_computed_at') AS last_computed_at
    FROM scored s
    WHERE (p_min_score IS NULL OR (s.health->>'score')::int >= p_min_score)
      AND (p_max_score IS NULL OR (s.health->>'score')::int <= p_max_score)
  )
  SELECT COUNT(*)::int INTO v_total FROM filtered;

  WITH scored AS (
    SELECT p.id, p.name, p.slug, p.type,
           (public.compute_content_health_score(p.id)) AS health
    FROM   public.products p
    WHERE  p.account_id = v_account_id
    ORDER  BY p.name
  ),
  filtered AS (
    SELECT s.id, s.name, s.slug, s.type,
           (s.health->>'score')::int AS score,
           jsonb_array_length(COALESCE(s.health->'ghosts','[]'::jsonb)) AS ghosts_count,
           (
             SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(s.health->'ai_fields','[]'::jsonb)) AS a
             WHERE  (a->>'locked')::boolean = false
           ) AS ai_unlocked_count,
           jsonb_array_length(COALESCE(s.health->'fallbacks','[]'::jsonb)) AS fallbacks_count,
           (s.health->>'last_computed_at') AS last_computed_at
    FROM scored s
    WHERE (p_min_score IS NULL OR (s.health->>'score')::int >= p_min_score)
      AND (p_max_score IS NULL OR (s.health->>'score')::int <= p_max_score)
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'product_id', f.id,
      'product_name', f.name,
      'product_slug', f.slug,
      'product_type', f.type,
      'score', f.score,
      'ghosts_count', f.ghosts_count,
      'ai_unlocked_count', f.ai_unlocked_count,
      'fallbacks_count', f.fallbacks_count,
      'last_computed_at', f.last_computed_at
    )
  ), '[]'::jsonb) INTO v_items
  FROM (SELECT * FROM filtered LIMIT v_limit OFFSET v_offset) f;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_products_content_health(UUID, INT, INT, INT, INT) TO anon, authenticated;

-- Rollback:
-- DROP FUNCTION IF EXISTS public.list_products_content_health(UUID, INT, INT, INT, INT);
-- DROP FUNCTION IF EXISTS public.get_product_content_health(UUID);
-- DROP FUNCTION IF EXISTS public.compute_content_health_score(UUID);
