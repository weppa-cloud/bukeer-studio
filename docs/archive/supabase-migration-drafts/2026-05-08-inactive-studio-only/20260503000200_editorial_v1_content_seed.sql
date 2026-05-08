-- ============================================================================
-- editorial-v1 content seed — ColombiaTours pilot flip (W5.16)
-- ============================================================================
-- Goal
--   1. Snapshot current `websites.theme` + `website_sections` rows into
--      `pilot_theme_snapshots` with reason = 'editorial_v1_content_seed'.
--   2. Replace `website_sections` rows for the pilot with the editorial-v1
--      default sections derived verbatim from docs/editorial-v1/copy-catalog.md
--      (EDITORIAL blocks only — CATALOG fields intentionally left empty).
--   3. Flip `websites.theme.profile.metadata.templateSet = 'editorial-v1'`.
--
-- Notes
--   * `website_sections` is a relational table (not a JSONB column on
--     `websites`). The snapshot preserves the current rows as a jsonb_agg
--     under `previous_theme.sections_snapshot`. The CHECK constraint on
--     `pilot_theme_snapshots.previous_theme` requires `tokens` + `profile`
--     keys, which are preserved verbatim from the current theme.
--   * Idempotent-safe: re-running creates a NEW snapshot (insert only) and
--     overwrites sections. Re-runs are explicitly supported.
--   * Rollback: see `-- ROLLBACK` block at the end of this file. The
--     pre-built `public.restore_pilot_theme_snapshot` RPC only restores
--     `websites.theme`, so the full rollback here uses targeted SQL that
--     replays `sections_snapshot` into `website_sections` as well.
-- ============================================================================

DO $mig$
DECLARE
  v_website_id uuid := '894545b7-73ca-4dae-b76a-da5b6a3f8441';
  v_account_id uuid := '9fc24733-b127-4184-aa22-12f03b98927a';
  v_current_theme jsonb;
  v_sections_snapshot jsonb;
  v_snapshot_payload jsonb;
  v_sections jsonb;
  v_section jsonb;
  v_rows_updated integer;
BEGIN
  -- 0. Resolve current theme + sections (source of snapshot)
  SELECT w.theme
    INTO v_current_theme
    FROM public.websites w
   WHERE w.id = v_website_id
     AND w.account_id = v_account_id
     AND w.deleted_at IS NULL
   LIMIT 1;

  IF v_current_theme IS NULL THEN
    RAISE EXCEPTION 'WEBSITE_NOT_FOUND for pilot website %', v_website_id;
  END IF;

  IF NOT (v_current_theme ? 'tokens') OR NOT (v_current_theme ? 'profile') THEN
    RAISE EXCEPTION 'PRE_CHECK_FAIL: current theme missing tokens/profile keys';
  END IF;

  SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'section_type', s.section_type,
          'variant', s.variant,
          'display_order', s.display_order,
          'is_enabled', s.is_enabled,
          'config', s.config,
          'content', s.content
        ) ORDER BY s.display_order
      ),
      '[]'::jsonb
    )
    INTO v_sections_snapshot
    FROM public.website_sections s
   WHERE s.website_id = v_website_id;

  -- WARN guard: log if the existing copy looks user-edited. We do not block
  -- because the product decision is big-bang replacement — the WARN lets ops
  -- notice if someone customized content between rehearsal and apply.
  IF (SELECT count(*) FROM public.website_sections WHERE website_id = v_website_id) = 0 THEN
    RAISE NOTICE '[editorial_v1_content_seed] no prior sections for website % — fresh seed', v_website_id;
  ELSE
    RAISE NOTICE '[editorial_v1_content_seed] replacing % existing sections for website %',
      (SELECT count(*) FROM public.website_sections WHERE website_id = v_website_id),
      v_website_id;
  END IF;

  -- 1. Build snapshot payload. tokens+profile satisfy the CHECK constraint on
  --    pilot_theme_snapshots. sections_snapshot carries the full relational
  --    rows captured above.
  v_snapshot_payload := jsonb_build_object(
    'tokens', v_current_theme->'tokens',
    'profile', v_current_theme->'profile',
    'sections_snapshot', v_sections_snapshot
  );

  INSERT INTO public.pilot_theme_snapshots (
    account_id, website_id, previous_theme, git_sha, reason
  ) VALUES (
    v_account_id,
    v_website_id,
    v_snapshot_payload,
    coalesce(current_setting('app.git_sha', true), 'editorial-v1-w516'),
    'editorial_v1_content_seed'
  );

  -- 2. Build the editorial sections array (copy verbatim from
  --    docs/editorial-v1/copy-catalog.md — see scripts/validate-editorial-seed.ts
  --    for the canonical TypeScript source of truth that was validated against
  --    the shared Zod schemas pre-apply).
  v_sections := jsonb_build_array(
    -- 0 — HERO
    jsonb_build_object(
      'section_type', 'hero',
      'variant', 'editorial',
      'display_order', 0,
      'is_enabled', true,
      'config', '{}'::jsonb,
      'content', jsonb_build_object(
        'eyebrow', 'Operador local · 14 años en Colombia',
        'headline', 'Colombia<br><em>como la cuenta</em><br>quien la camina.',
        'title', 'Colombia como la cuenta quien la camina.',
        'subtitle', 'Itinerarios diseñados con guías locales, fincas familiares y rincones que no salen en las guías. Desde el Caribe hasta la Amazonía.',
        'ctas', jsonb_build_array(
          jsonb_build_object('label', 'Planea mi viaje', 'href', '{{whatsapp}}', 'variant', 'accent'),
          jsonb_build_object('label', 'Ver paquetes', 'href', '/paquetes', 'variant', 'ghost')
        ),
        'sideList', jsonb_build_array(
          jsonb_build_object('label', 'Cartagena', 'badge', 'Caribe'),
          jsonb_build_object('label', 'Tayrona', 'badge', 'Sierra'),
          jsonb_build_object('label', 'Eje Cafetero', 'badge', 'Andes'),
          jsonb_build_object('label', 'Medellín', 'badge', 'Antioquia')
        ),
        'trustChip', jsonb_build_object(
          'label', 'Planners en línea · responden en ~3 min'
        ),
        'search', jsonb_build_object(
          'enabled', true,
          'placeholderDestino', 'Caribe · Colombia',
          'placeholderFechas', 'Octubre 2026 · 7 noches',
          'placeholderViajeros', '2 viajeros',
          'placeholderCta', 'Buscar'
        )
      )
    ),

    -- 1 — TRUST BAR F1
    jsonb_build_object(
      'section_type', 'trust_bar',
      'variant', 'editorial',
      'display_order', 1,
      'is_enabled', true,
      'config', '{}'::jsonb,
      'content', jsonb_build_object(
        'liveLabel', 'Planners en línea',
        'liveResponseTime', '3 min',
        'items', jsonb_build_array(
          jsonb_build_object('live', true, 'bold', 'Planners en línea', 'body', 'responden en ~3 min'),
          jsonb_build_object('icon', 'shield', 'bold', 'RNT 83412', 'body', 'Operador local desde 2011'),
          jsonb_build_object('icon', 'check', 'bold', 'Revisado por humanos', 'body', 'cada itinerario'),
          jsonb_build_object('icon', 'star', 'bold', '4.9/5', 'body', '3,200+ reseñas verificadas')
        )
      )
    ),

    -- 2 — DESTINATIONS (map view)
    jsonb_build_object(
      'section_type', 'destinations',
      'variant', 'map',
      'display_order', 2,
      'is_enabled', true,
      'config', '{}'::jsonb,
      'content', jsonb_build_object(
        'eyebrow', 'Destinos',
        'title', 'Ocho Colombias <span class=''serif''>en un mismo viaje.</span>',
        'subtitle', 'Del mar de siete colores al desierto de La Guajira. Cada región con sus guías, sus sabores y su ritmo.',
        'view', 'map',
        'viewMode', 'map',
        'enableToggle', true,
        'destinations', '[]'::jsonb
      )
    ),

    -- 3 — PACKAGES
    jsonb_build_object(
      'section_type', 'packages',
      'variant', 'editorial',
      'display_order', 3,
      'is_enabled', true,
      'config', '{}'::jsonb,
      'content', jsonb_build_object(
        'eyebrow', 'Paquetes',
        'title', 'Itinerarios pensados, <span class=''serif''>listos para ajustarse a ti.</span>',
        'filterTabs', jsonb_build_array('Todos', 'Playa', 'Aventura', 'Cultura', 'Naturaleza'),
        'viewAllLabel', 'Ver todos los paquetes',
        'viewAllHref', '/paquetes',
        'packages', '[]'::jsonb
      )
    ),

    -- 4 — EXPLORE MAP
    jsonb_build_object(
      'section_type', 'explore_map',
      'variant', 'editorial',
      'display_order', 4,
      'is_enabled', true,
      'config', '{}'::jsonb,
      'content', jsonb_build_object(
        'eyebrow', 'Explora Colombia',
        'title', 'Un país <span class=''serif''>en cada región.</span>',
        'subtitle', 'Del Caribe al Amazonas, de los Andes al Pacífico. Pasa el cursor por el mapa para ver a dónde puedes ir — o filtra por región.',
        'regions', jsonb_build_array(
          jsonb_build_object('key', 'caribe', 'label', 'Caribe'),
          jsonb_build_object('key', 'andes', 'label', 'Andes'),
          jsonb_build_object('key', 'selva', 'label', 'Selva'),
          jsonb_build_object('key', 'pacifico', 'label', 'Pacífico')
        ),
        'ctaLabel', 'Ver paquetes',
        'ctaHref', '/paquetes',
        'secondaryCtaLabel', 'Buscar destino',
        'secondaryCtaHref', '/buscar',
        'destinations', '[]'::jsonb
      )
    ),

    -- 5 — STATS
    jsonb_build_object(
      'section_type', 'stats',
      'variant', 'editorial',
      'display_order', 5,
      'is_enabled', true,
      'config', '{}'::jsonb,
      'content', jsonb_build_object(
        'items', jsonb_build_array(
          jsonb_build_object('value', '12.4k', 'suffix', '+', 'label', 'viajeros en 14 años'),
          jsonb_build_object('value', '4.9', 'suffix', '/5', 'label', 'promedio en 3,200 reseñas'),
          jsonb_build_object('value', '96', 'suffix', '%', 'label', 'recomendaría a un amigo'),
          jsonb_build_object('value', '32', 'suffix', '', 'label', 'destinos únicos en Colombia')
        ),
        'metrics', jsonb_build_array(
          jsonb_build_object('value', '12.4k', 'suffix', '+', 'label', 'viajeros en 14 años'),
          jsonb_build_object('value', '4.9', 'suffix', '/5', 'label', 'promedio en 3,200 reseñas'),
          jsonb_build_object('value', '96', 'suffix', '%', 'label', 'recomendaría a un amigo'),
          jsonb_build_object('value', '32', 'suffix', '', 'label', 'destinos únicos en Colombia')
        )
      )
    ),

    -- 6 — ABOUT (promise variant)
    jsonb_build_object(
      'section_type', 'about',
      'variant', 'promise',
      'display_order', 6,
      'is_enabled', true,
      'config', '{}'::jsonb,
      'content', jsonb_build_object(
        'eyebrow', 'Por qué ColombiaTours',
        'title', 'Un viaje bien hecho <em>se nota.</em>',
        'subtitle', 'No vendemos cupos: diseñamos viajes. Cada ruta pasa por manos de un planner local que la conoce porque la ha caminado.',
        'ctaLabel', 'Hablar con un planner',
        'ctaUrl', '{{whatsapp}}',
        'features', jsonb_build_array(
          jsonb_build_object(
            'icon', 'pin',
            'title', 'Operador local, no intermediario',
            'description', 'Somos la agencia. Sin triangulaciones ni sorpresas de último momento.'
          ),
          jsonb_build_object(
            'icon', 'shield',
            'title', 'Viaje asegurado de punta a punta',
            'description', 'Asistencia médica, cobertura de cancelación y atención 24/7 en español, inglés y francés.'
          ),
          jsonb_build_object(
            'icon', 'leaf',
            'title', 'Turismo con impacto',
            'description', 'Alojamientos familiares, guías de las comunidades y operaciones bajas en huella.'
          ),
          jsonb_build_object(
            'icon', 'sparkle',
            'title', 'Diseño a tu medida',
            'description', 'Tu planner asignado ajusta itinerario, hoteles y ritmo hasta que sea exactamente tu viaje.'
          )
        )
      )
    ),

    -- 7 — PLANNERS
    jsonb_build_object(
      'section_type', 'planners',
      'variant', 'editorial',
      'display_order', 7,
      'is_enabled', true,
      'config', '{}'::jsonb,
      'content', jsonb_build_object(
        'eyebrow', 'Tu planner',
        'title', 'Una persona <span class=''serif''>que te conoce</span> de principio a fin.',
        'subtitle', 'Emparejamos tu perfil con el planner que más sabe de la región o experiencia que buscas.',
        'viewAllLabel', 'Ver todos',
        'viewAllHref', '/planners',
        'planners', '[]'::jsonb
      )
    ),

    -- 8 — TESTIMONIALS
    jsonb_build_object(
      'section_type', 'testimonials',
      'variant', 'editorial',
      'display_order', 8,
      'is_enabled', true,
      'config', '{}'::jsonb,
      'content', jsonb_build_object(
        'eyebrow', 'Testimonios',
        'title', 'El recuerdo <span class=''serif''>después del viaje.</span>',
        'testimonials', '[]'::jsonb
      )
    ),

    -- 9 — BLOG
    jsonb_build_object(
      'section_type', 'blog',
      'variant', 'editorial',
      'display_order', 9,
      'is_enabled', true,
      'config', '{}'::jsonb,
      'content', jsonb_build_object(
        'eyebrow', 'Blog',
        'title', 'Historias desde adentro.',
        'subtitle', 'Escrito por los planners que caminan Colombia todos los meses. Guías, itinerarios, oficios y rincones.',
        'viewAllLabel', 'Ver todo el blog',
        'viewAllHref', '/blog',
        'posts', '[]'::jsonb
      )
    ),

    -- 10 — FAQ
    jsonb_build_object(
      'section_type', 'faq',
      'variant', 'editorial',
      'display_order', 10,
      'is_enabled', true,
      'config', '{}'::jsonb,
      'content', jsonb_build_object(
        'eyebrow', 'Preguntas frecuentes',
        'title', 'Lo que <span class=''serif''>nos preguntan</span> antes de reservar.',
        'helperText', '¿No encuentras la respuesta? Escribe a tu planner — respondemos en <2h hábiles.',
        'ctaLabel', 'Chat por WhatsApp',
        'ctaUrl', '{{whatsapp}}',
        'faqs', jsonb_build_array(
          jsonb_build_object(
            'question', '¿Es seguro viajar a Colombia hoy?',
            'answer',   'Sí. Nuestros destinos son áreas turísticas consolidadas, con protocolos de seguridad y guías locales certificados. Hacemos monitoreo permanente y ajustamos rutas si hace falta.'
          ),
          jsonb_build_object(
            'question', '¿Qué incluye el precio del paquete?',
            'answer',   'Alojamiento, traslados terrestres/aéreos especificados, tours guiados, entradas a parques y desayunos. Revisa la ficha de cada paquete — marcamos con check lo incluido y con dash lo opcional.'
          ),
          jsonb_build_object(
            'question', '¿Puedo personalizar el itinerario?',
            'answer',   'Todos los paquetes son punto de partida. Tu planner asignado puede agregar días, cambiar hoteles, sumar actividades o reemplazar destinos. Sin costo por ajustar antes de confirmar.'
          ),
          jsonb_build_object(
            'question', '¿Cómo se paga la reserva?',
            'answer',   '30% para confirmar, saldo 30 días antes del viaje. Aceptamos tarjeta internacional, PSE, transferencia y, para USA/EU, también PayPal y link de pago.'
          ),
          jsonb_build_object(
            'question', '¿Qué pasa si tengo que cancelar?',
            'answer',   'Cancelación flexible hasta 45 días antes (reembolso 90%). Entre 45 y 15 días, 50%. Menos de 15 días, el anticipo queda como crédito de viaje por 12 meses.'
          ),
          jsonb_build_object(
            'question', '¿Necesito vacunas o visa?',
            'answer',   'La mayoría de pasaportes no requiere visa por menos de 90 días. Fiebre amarilla es recomendada (no obligatoria) para Amazonas y Pacífico. Te enviamos la checklist exacta según tu nacionalidad.'
          )
        )
      )
    ),

    -- 11 — CTA
    jsonb_build_object(
      'section_type', 'cta',
      'variant', 'editorial',
      'display_order', 11,
      'is_enabled', true,
      'config', '{}'::jsonb,
      'content', jsonb_build_object(
        'eyebrow', 'Empieza hoy',
        'title', 'Tu Colombia, <em>en 3 pasos.</em>',
        'subtitle', 'Cuéntanos qué buscas, recibe una propuesta en 24h con 2–3 rutas posibles, y ajusta con tu planner hasta que sea el viaje que quieres.',
        'ctas', jsonb_build_array(
          jsonb_build_object('label', 'Planea mi viaje', 'href', '{{whatsapp}}', 'variant', 'accent'),
          jsonb_build_object('label', 'Chat WhatsApp', 'href', '{{whatsapp}}', 'variant', 'ghost')
        )
      )
    )
  );

  -- 3. Apply the new sections atomically. We delete-then-insert inside this
  --    same DO block so the whole exchange is one transaction.
  DELETE FROM public.website_sections WHERE website_id = v_website_id;

  FOR v_section IN SELECT * FROM jsonb_array_elements(v_sections) LOOP
    INSERT INTO public.website_sections (
      id, website_id, section_type, variant, display_order,
      is_enabled, config, content, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_website_id,
      v_section->>'section_type',
      v_section->>'variant',
      (v_section->>'display_order')::int,
      (v_section->>'is_enabled')::boolean,
      coalesce(v_section->'config', '{}'::jsonb),
      coalesce(v_section->'content', '{}'::jsonb),
      now(),
      now()
    );
  END LOOP;

  -- 4. Flip the templateSet marker on the theme profile metadata.
  UPDATE public.websites
     SET theme = jsonb_set(
           coalesce(theme, '{}'::jsonb),
           '{profile,metadata,templateSet}',
           '"editorial-v1"'::jsonb,
           true
         ),
         updated_at = now()
   WHERE id = v_website_id
     AND account_id = v_account_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated <> 1 THEN
    RAISE EXCEPTION 'WEBSITE_NOT_FOUND on templateSet flip for %', v_website_id;
  END IF;

  RAISE NOTICE '[editorial_v1_content_seed] seeded % sections and flipped templateSet = editorial-v1 for website %',
    jsonb_array_length(v_sections), v_website_id;
END $mig$;

-- ============================================================================
-- ROLLBACK (manual — not auto-applied)
-- ----------------------------------------------------------------------------
-- Option A: targeted revert (restores sections + unsets templateSet)
-- ----------------------------------------------------------------------------
-- DO $rb$
-- DECLARE
--   v_website_id uuid := '894545b7-73ca-4dae-b76a-da5b6a3f8441';
--   v_snap jsonb;
--   v_section jsonb;
-- BEGIN
--   SELECT s.previous_theme
--     INTO v_snap
--     FROM public.pilot_theme_snapshots s
--    WHERE s.website_id = v_website_id
--      AND s.reason = 'editorial_v1_content_seed'
--    ORDER BY s.created_at DESC
--    LIMIT 1;
--
--   IF v_snap IS NULL THEN
--     RAISE EXCEPTION 'NO_SNAPSHOT_FOUND for %', v_website_id;
--   END IF;
--
--   DELETE FROM public.website_sections WHERE website_id = v_website_id;
--
--   FOR v_section IN SELECT * FROM jsonb_array_elements(coalesce(v_snap->'sections_snapshot', '[]'::jsonb)) LOOP
--     INSERT INTO public.website_sections (
--       id, website_id, section_type, variant, display_order,
--       is_enabled, config, content, created_at, updated_at
--     ) VALUES (
--       coalesce((v_section->>'id')::uuid, gen_random_uuid()),
--       v_website_id,
--       v_section->>'section_type',
--       v_section->>'variant',
--       (v_section->>'display_order')::int,
--       (v_section->>'is_enabled')::boolean,
--       coalesce(v_section->'config', '{}'::jsonb),
--       coalesce(v_section->'content', '{}'::jsonb),
--       now(), now()
--     );
--   END LOOP;
--
--   UPDATE public.websites
--      SET theme = jsonb_set(theme, '{profile,metadata,templateSet}', 'null'::jsonb, true),
--          updated_at = now()
--    WHERE id = v_website_id;
-- END $rb$;
--
-- ----------------------------------------------------------------------------
-- Option B: full theme restore (drops the templateSet along with any other
-- designer theme changes). Does NOT restore sections — pair with Option A's
-- DELETE+INSERT block if you need both.
-- ----------------------------------------------------------------------------
-- SELECT public.restore_pilot_theme_snapshot(
--   (SELECT id FROM public.pilot_theme_snapshots
--     WHERE website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
--       AND reason = 'editorial_v1_content_seed'
--     ORDER BY created_at DESC LIMIT 1),
--   true
-- );
-- ============================================================================
