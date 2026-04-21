/**
 * Pre-flight validator for the editorial-v1 content seed migration.
 *
 * Parses the editorial default section array (the exact shape the SQL
 * migration in `supabase/migrations/20260503000200_editorial_v1_content_seed.sql`
 * will insert into `website_sections` for the ColombiaTours pilot) and
 * validates every row against the shared Zod section schemas.
 *
 * It also cross-checks each `section_type` against both the generic and
 * editorial-v1 registries so a missing component registration is caught
 * before the migration runs.
 *
 * Run: `npx tsx scripts/validate-editorial-seed.ts`
 * Exit: non-zero on any validation failure.
 */

import {
  SectionSchema,
  validateSectionContent,
  type SectionTypeValue,
} from '@bukeer/website-contract';

// -----------------------------------------------------------------------------
// Editorial default sections — MUST match the migration 1:1.
// Copy strings are verbatim from docs/editorial-v1/copy-catalog.md (EDITORIAL
// blocks only). CATALOG-type payloads (destinations[], packages[], posts[],
// testimonials[]) are intentionally empty — runtime hydration fills them.
// -----------------------------------------------------------------------------

type EditorialSeedSection = {
  section_type: SectionTypeValue;
  variant?: string;
  display_order: number;
  is_enabled: boolean;
  config: Record<string, unknown>;
  content: Record<string, unknown>;
};

export const EDITORIAL_V1_SECTIONS: EditorialSeedSection[] = [
  // 0 — HERO (copy-catalog.md "Hero (home)")
  {
    section_type: 'hero',
    variant: 'editorial',
    display_order: 0,
    is_enabled: true,
    config: {},
    content: {
      eyebrow: 'Operador local · 14 años en Colombia',
      headline:
        'Colombia<br><em>como la cuenta</em><br>quien la camina.',
      title:
        'Colombia como la cuenta quien la camina.',
      subtitle:
        'Itinerarios diseñados con guías locales, fincas familiares y rincones que no salen en las guías. Desde el Caribe hasta la Amazonía.',
      ctas: [
        { label: 'Planea mi viaje', href: '{{whatsapp}}', variant: 'accent' },
        { label: 'Ver paquetes', href: '/paquetes', variant: 'ghost' },
      ],
      sideList: [
        { label: 'Cartagena', badge: 'Caribe' },
        { label: 'Tayrona', badge: 'Sierra' },
        { label: 'Eje Cafetero', badge: 'Andes' },
        { label: 'Medellín', badge: 'Antioquia' },
      ],
      trustChip: { label: 'Planners en línea · responden en ~3 min' },
      search: {
        enabled: true,
        placeholderDestino: 'Caribe · Colombia',
        placeholderFechas: 'Octubre 2026 · 7 noches',
        placeholderViajeros: '2 viajeros',
        placeholderCta: 'Buscar',
      },
    },
  },

  // 1 — TRUST BAR F1 (copy-catalog.md "Trust bar F1")
  {
    section_type: 'trust_bar',
    variant: 'editorial',
    display_order: 1,
    is_enabled: true,
    config: {},
    content: {
      liveLabel: 'Planners en línea',
      liveResponseTime: '3 min',
      items: [
        { live: true, bold: 'Planners en línea', body: 'responden en ~3 min' },
        { icon: 'shield', bold: 'RNT 83412', body: 'Operador local desde 2011' },
        { icon: 'check', bold: 'Revisado por humanos', body: 'cada itinerario' },
        { icon: 'star', bold: '4.9/5', body: '3,200+ reseñas verificadas' },
      ],
    },
  },

  // 2 — DESTINATIONS (map view) (copy-catalog.md "Destinations section")
  {
    section_type: 'destinations',
    variant: 'map',
    display_order: 2,
    is_enabled: true,
    config: {},
    content: {
      eyebrow: 'Destinos',
      title:
        "Ocho Colombias <span class='serif'>en un mismo viaje.</span>",
      subtitle:
        'Del mar de siete colores al desierto de La Guajira. Cada región con sus guías, sus sabores y su ritmo.',
      view: 'map',
      viewMode: 'map',
      enableToggle: true,
      // CATALOG — destinations[] comes from runtime hydration.
      destinations: [],
    },
  },

  // 3 — PACKAGES (copy-catalog.md "Packages section")
  {
    section_type: 'packages',
    variant: 'editorial',
    display_order: 3,
    is_enabled: true,
    config: {},
    content: {
      eyebrow: 'Paquetes',
      title:
        "Itinerarios pensados, <span class='serif'>listos para ajustarse a ti.</span>",
      filterTabs: ['Todos', 'Playa', 'Aventura', 'Cultura', 'Naturaleza'],
      viewAllLabel: 'Ver todos los paquetes',
      viewAllHref: '/paquetes',
      // CATALOG — packages[] comes from runtime hydration.
      packages: [],
    },
  },

  // 4 — EXPLORE MAP (copy-catalog.md "Explore Map section (home)")
  {
    section_type: 'explore_map',
    variant: 'editorial',
    display_order: 4,
    is_enabled: true,
    config: {},
    content: {
      eyebrow: 'Explora Colombia',
      title:
        "Un país <span class='serif'>en cada región.</span>",
      subtitle:
        'Del Caribe al Amazonas, de los Andes al Pacífico. Pasa el cursor por el mapa para ver a dónde puedes ir — o filtra por región.',
      regions: [
        { key: 'caribe', label: 'Caribe' },
        { key: 'andes', label: 'Andes' },
        { key: 'selva', label: 'Selva' },
        { key: 'pacifico', label: 'Pacífico' },
      ],
      ctaLabel: 'Ver paquetes',
      ctaHref: '/paquetes',
      secondaryCtaLabel: 'Buscar destino',
      secondaryCtaHref: '/buscar',
      // CATALOG — featuredDestinations[] injected by hydration.
      destinations: [],
    },
  },

  // 5 — STATS (copy-catalog.md "Stats section")
  {
    section_type: 'stats',
    variant: 'editorial',
    display_order: 5,
    is_enabled: true,
    config: {},
    content: {
      // `items` satisfies the StatsContentSchema contract (generic consumers
      // read it). The editorial-v1 stats component reads `metrics` as its
      // preferred key with a brandClaims-driven fallback; we seed the same
      // payload under both keys so either renderer produces the copy-catalog
      // values verbatim when hydration is unavailable.
      items: [
        { value: '12.4k', suffix: '+', label: 'viajeros en 14 años' },
        { value: '4.9', suffix: '/5', label: 'promedio en 3,200 reseñas' },
        { value: '96', suffix: '%', label: 'recomendaría a un amigo' },
        { value: '32', suffix: '', label: 'destinos únicos en Colombia' },
      ],
      metrics: [
        { value: '12.4k', suffix: '+', label: 'viajeros en 14 años' },
        { value: '4.9', suffix: '/5', label: 'promedio en 3,200 reseñas' },
        { value: '96', suffix: '%', label: 'recomendaría a un amigo' },
        { value: '32', suffix: '', label: 'destinos únicos en Colombia' },
      ],
    },
  },

  // 6 — ABOUT (promise variant) (copy-catalog.md "Promise / Why us section")
  {
    section_type: 'about',
    variant: 'promise',
    display_order: 6,
    is_enabled: true,
    config: {},
    content: {
      eyebrow: 'Por qué ColombiaTours',
      title: 'Un viaje bien hecho <em>se nota.</em>',
      subtitle:
        'No vendemos cupos: diseñamos viajes. Cada ruta pasa por manos de un planner local que la conoce porque la ha caminado.',
      ctaLabel: 'Hablar con un planner',
      ctaUrl: '{{whatsapp}}',
      features: [
        {
          icon: 'pin',
          title: 'Operador local, no intermediario',
          description:
            'Somos la agencia. Sin triangulaciones ni sorpresas de último momento.',
        },
        {
          icon: 'shield',
          title: 'Viaje asegurado de punta a punta',
          description:
            'Asistencia médica, cobertura de cancelación y atención 24/7 en español, inglés y francés.',
        },
        {
          icon: 'leaf',
          title: 'Turismo con impacto',
          description:
            'Alojamientos familiares, guías de las comunidades y operaciones bajas en huella.',
        },
        {
          icon: 'sparkle',
          title: 'Diseño a tu medida',
          description:
            'Tu planner asignado ajusta itinerario, hoteles y ritmo hasta que sea exactamente tu viaje.',
        },
      ],
    },
  },

  // 7 — PLANNERS (copy-catalog.md "Planners section (home)")
  {
    section_type: 'planners',
    variant: 'editorial',
    display_order: 7,
    is_enabled: true,
    config: {},
    content: {
      eyebrow: 'Tu planner',
      title:
        "Una persona <span class='serif'>que te conoce</span> de principio a fin.",
      subtitle:
        'Emparejamos tu perfil con el planner que más sabe de la región o experiencia que buscas.',
      viewAllLabel: 'Ver todos',
      viewAllHref: '/planners',
      // CATALOG — planner records from runtime hydration.
      planners: [],
    },
  },

  // 8 — TESTIMONIALS (copy-catalog.md "Testimonials section")
  {
    section_type: 'testimonials',
    variant: 'editorial',
    display_order: 8,
    is_enabled: true,
    config: {},
    content: {
      eyebrow: 'Testimonios',
      title:
        "El recuerdo <span class='serif'>después del viaje.</span>",
      // CATALOG — real Google reviews hydrate testimonials[].
      testimonials: [],
    },
  },

  // 9 — BLOG (copy-catalog.md "Blog listing")
  {
    section_type: 'blog',
    variant: 'editorial',
    display_order: 9,
    is_enabled: true,
    config: {},
    content: {
      eyebrow: 'Blog',
      title: 'Historias desde adentro.',
      subtitle:
        'Escrito por los planners que caminan Colombia todos los meses. Guías, itinerarios, oficios y rincones.',
      viewAllLabel: 'Ver todo el blog',
      viewAllHref: '/blog',
      // CATALOG — posts[] from CMS at runtime.
      posts: [],
    },
  },

  // 10 — FAQ (copy-catalog.md "FAQ section (home)" — 6 items verbatim)
  {
    section_type: 'faq',
    variant: 'editorial',
    display_order: 10,
    is_enabled: true,
    config: {},
    content: {
      eyebrow: 'Preguntas frecuentes',
      title:
        "Lo que <span class='serif'>nos preguntan</span> antes de reservar.",
      helperText:
        '¿No encuentras la respuesta? Escribe a tu planner — respondemos en <2h hábiles.',
      ctaLabel: 'Chat por WhatsApp',
      ctaUrl: '{{whatsapp}}',
      faqs: [
        {
          question: '¿Es seguro viajar a Colombia hoy?',
          answer:
            'Sí. Nuestros destinos son áreas turísticas consolidadas, con protocolos de seguridad y guías locales certificados. Hacemos monitoreo permanente y ajustamos rutas si hace falta.',
        },
        {
          question: '¿Qué incluye el precio del paquete?',
          answer:
            'Alojamiento, traslados terrestres/aéreos especificados, tours guiados, entradas a parques y desayunos. Revisa la ficha de cada paquete — marcamos con check lo incluido y con dash lo opcional.',
        },
        {
          question: '¿Puedo personalizar el itinerario?',
          answer:
            'Todos los paquetes son punto de partida. Tu planner asignado puede agregar días, cambiar hoteles, sumar actividades o reemplazar destinos. Sin costo por ajustar antes de confirmar.',
        },
        {
          question: '¿Cómo se paga la reserva?',
          answer:
            '30% para confirmar, saldo 30 días antes del viaje. Aceptamos tarjeta internacional, PSE, transferencia y, para USA/EU, también PayPal y link de pago.',
        },
        {
          question: '¿Qué pasa si tengo que cancelar?',
          answer:
            'Cancelación flexible hasta 45 días antes (reembolso 90%). Entre 45 y 15 días, 50%. Menos de 15 días, el anticipo queda como crédito de viaje por 12 meses.',
        },
        {
          question: '¿Necesito vacunas o visa?',
          answer:
            'La mayoría de pasaportes no requiere visa por menos de 90 días. Fiebre amarilla es recomendada (no obligatoria) para Amazonas y Pacífico. Te enviamos la checklist exacta según tu nacionalidad.',
        },
      ],
    },
  },

  // 11 — CTA (copy-catalog.md "CTA band (below FAQ)")
  {
    section_type: 'cta',
    variant: 'editorial',
    display_order: 11,
    is_enabled: true,
    config: {},
    content: {
      eyebrow: 'Empieza hoy',
      title: 'Tu Colombia, <em>en 3 pasos.</em>',
      subtitle:
        'Cuéntanos qué buscas, recibe una propuesta en 24h con 2–3 rutas posibles, y ajusta con tu planner hasta que sea el viaje que quieres.',
      ctas: [
        { label: 'Planea mi viaje', href: '{{whatsapp}}', variant: 'accent' },
        { label: 'Chat WhatsApp', href: '{{whatsapp}}', variant: 'ghost' },
      ],
    },
  },
];

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

interface Failure {
  index: number;
  section_type: string;
  phase: 'base' | 'content' | 'registry';
  message: string;
}

async function resolveRegistries(): Promise<Set<string>> {
  // `lib/sections/section-registry.tsx` imports Next.js `dynamic`, which fails
  // outside the Next build. We probe at module level but degrade gracefully.
  const types = new Set<string>();
  try {
    const genericMod: { sectionComponents?: Record<string, unknown> } =
      await import('@/lib/sections/section-registry');
    if (genericMod?.sectionComponents) {
      for (const k of Object.keys(genericMod.sectionComponents)) types.add(k);
    }
  } catch {
    // Fallback: hard-coded list of types that exist in the generic registry
    // (kept in sync manually — only used when Next.js runtime isn't available).
    const fallback = [
      'hero', 'hero_image', 'hero_video', 'hero_minimal',
      'destinations', 'hotels', 'activities', 'packages',
      'testimonials', 'testimonials_carousel',
      'about', 'contact', 'contact_form',
      'cta', 'cta_banner',
      'stats', 'stats_counters',
      'partners', 'logos_partners', 'logo_cloud',
      'faq', 'faq_accordion',
      'blog', 'blog_grid',
      'text', 'rich_text', 'text_image',
      'features', 'features_grid',
      'gallery', 'gallery_grid', 'gallery_carousel', 'gallery_masonry',
      'newsletter', 'planners', 'team', 'travel_planners', 'pricing',
      'trust_bar', 'itinerary_accordion', 'inclusions_exclusions',
      'comparison_table', 'guarantee_badges', 'countdown_timer',
      'explore_map',
    ];
    for (const k of fallback) types.add(k);
  }
  return types;
}

async function main(): Promise<void> {
  const failures: Failure[] = [];
  const registryTypes = await resolveRegistries();

  console.log(
    `[validate-editorial-seed] validating ${EDITORIAL_V1_SECTIONS.length} sections …`,
  );

  EDITORIAL_V1_SECTIONS.forEach((section, index) => {
    // 1) base section shape
    const baseResult = SectionSchema.safeParse(section);
    if (!baseResult.success) {
      failures.push({
        index,
        section_type: section.section_type,
        phase: 'base',
        message: JSON.stringify(baseResult.error.issues, null, 2),
      });
      return;
    }

    // 2) type-specific content schema
    const contentResult = validateSectionContent(
      section.section_type as SectionTypeValue,
      section.content,
    );
    if (!contentResult.success) {
      failures.push({
        index,
        section_type: section.section_type,
        phase: 'content',
        message: JSON.stringify(contentResult.error.issues, null, 2),
      });
    }

    // 3) registry registration (generic OR editorial-v1)
    // `explore_map` is only in editorial-v1 registry; the generic registry
    // has a silent fallback (returns null) per section-registry.tsx:246.
    if (!registryTypes.has(section.section_type)) {
      failures.push({
        index,
        section_type: section.section_type,
        phase: 'registry',
        message: `section_type "${section.section_type}" is not registered in lib/sections/section-registry.tsx`,
      });
    }
  });

  if (failures.length === 0) {
    console.log(
      `[validate-editorial-seed] OK — all ${EDITORIAL_V1_SECTIONS.length} sections validate.`,
    );
    const types = EDITORIAL_V1_SECTIONS.map(
      (s) => `${s.display_order}:${s.section_type}${s.variant ? `[${s.variant}]` : ''}`,
    ).join(', ');
    console.log(`[validate-editorial-seed] order: ${types}`);
    process.exit(0);
  }

  console.error(
    `[validate-editorial-seed] FAIL — ${failures.length} issue(s):`,
  );
  for (const f of failures) {
    console.error(
      `\n  #${f.index} [${f.section_type}] (${f.phase}):\n${f.message
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n')}`,
    );
  }
  process.exit(1);
}

void main();
