/**
 * EPIC #214 · W4 #218 — Pilot Readiness seed (ColombiaTours-shaped).
 *
 * Variant factory that seeds `pilot-colombiatours-*` namespaced fixtures used
 * by the W4 editor→render E2E specs (this wave) and consumed later by W5
 * (translation-ready) + W6 (visual matrix + Lighthouse).
 *
 * Design principles (TVB Round 2 APPROVED):
 *   - Namespace `pilot-colombiatours-*` coexists with `e2e-qa-package-*`
 *     (from `seed.ts::seedWave2Fixtures`) — zero slug collision.
 *   - Idempotent: select-first-then-update pattern (same fix as PR #233 for
 *     the `set_package_kit_slug` BEFORE-INSERT trigger).
 *   - Per-variant + per-process memoisation so multiple specs in one run
 *     share one DB round-trip.
 *   - Narrow cleanup: DELETE only rows matching `slug LIKE 'pilot-colombiatours-%'`
 *     scoped by `account_id` + `website_id`. Never truncates tables.
 *   - ADR-024: no booking fixtures. ADR-025: Hotels as-is (Flutter-owner) —
 *     this seed does not write hotel editor fixtures.
 *
 * Consumers:
 *   - W4 #218 editor→render specs (this PR).
 *   - W5 #219 translation lifecycle specs (translation-ready variant).
 *   - W6 #220 visual matrix + Lighthouse (consumes baseline + translation-ready).
 *
 * Not in this seed:
 *   - Activity marketing fixtures with non-trivial bodies beyond the seed
 *     baseline — activities gain the same parity columns as packages via
 *     PR #229 (`update_activity_marketing_field` RPC).
 *   - Booking / lead fixtures — ADR-024 DEFER.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertSeedEnvAllowsMutation, seedTestData } from './seed';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// --- Slug namespace --------------------------------------------------------

export type PilotSeedVariant =
  | 'baseline'
  | 'translation-ready'
  | 'empty-state'
  | 'missing-locale';

const SLUG_NS = 'pilot-colombiatours';

function slugs(variant: PilotSeedVariant) {
  return {
    package: `${SLUG_NS}-pkg-${variant}`,
    activity: `${SLUG_NS}-act-${variant}`,
    blog: `${SLUG_NS}-blog-${variant}`,
  } as const;
}

// --- Public result shape ----------------------------------------------------

export interface PilotSeedPackage {
  id: string;
  slug: string;
  itineraryId: string | null;
  productPageId: string | null;
}

export interface PilotSeedActivity {
  id: string;
  slug: string;
  productPageId: string | null;
}

export interface PilotSeedBlogPost {
  id: string;
  slug: string;
  locale: string;
}

export interface PilotSeedResult {
  variant: PilotSeedVariant;
  accountId: string;
  websiteId: string;
  subdomain: string;
  packages: PilotSeedPackage[];
  activities: PilotSeedActivity[];
  blogPosts: PilotSeedBlogPost[];
  warnings: string[];
}

// --- Memoisation ------------------------------------------------------------

const variantCache = new Map<PilotSeedVariant, Promise<PilotSeedResult>>();

function errorMessage(error: unknown): string {
  if (!error) return 'unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return JSON.stringify(error);
}

// --- Content templates per variant -----------------------------------------

interface PackageTemplate {
  name: string;
  description: string | null;
  program_highlights: string[];
  program_inclusions: string[];
  program_exclusions: string[];
  program_notes: string | null;
  program_meeting_info: string | null;
  cover_image_url: string | null;
  video_url: string | null;
  video_caption: string | null;
  description_ai_generated: boolean;
  highlights_ai_generated: boolean;
}

interface ActivityTemplate {
  name: string;
  description: string | null;
  program_highlights: string[];
  program_inclusions: string[];
  program_exclusions: string[];
  cover_image_url: string | null;
}

interface BlogTemplate {
  title: string;
  excerpt: string | null;
  content: string;
  locale: string;
  status: string;
}

interface OverlayTemplate {
  custom_hero: {
    title: string | null;
    subtitle: string | null;
    backgroundImage: string | null;
  } | null;
  custom_sections: Array<{
    id: string;
    type: 'text' | 'image_text' | 'cta' | 'spacer';
    position: number;
    content: Record<string, unknown>;
  }>;
  sections_order: string[];
  hidden_sections: string[];
  custom_seo_title: string | null;
  custom_seo_description: string | null;
  custom_faq: Array<{ question: string; answer: string }>;
}

function packageTemplateFor(variant: PilotSeedVariant): PackageTemplate {
  const DESCRIPTION_BASELINE =
    'Recorre la Colombia profunda con un itinerario diseñado por expertos locales: Bogotá colonial, el Eje Cafetero y Cartagena amurallada. Incluye hoteles 4*, guías bilingües y traslados privados en transportes climatizados.';
  const DESCRIPTION_TRANSLATION =
    'Descubre lo mejor de Colombia en 10 días: Bogotá histórica, paisajes cafeteros, playas de Tayrona y la Ciudad Amurallada de Cartagena. Con guía bilingüe en español e inglés, alojamiento boutique y transporte privado puerta a puerta.';

  switch (variant) {
    case 'baseline':
      return {
        name: 'Colombia Clásica 10 días — Pilot baseline',
        description: DESCRIPTION_BASELINE,
        program_highlights: [
          'Museo del Oro y La Candelaria en Bogotá',
          'Hacienda cafetera con cata guiada en Salento',
          'Ciudad Amurallada + Islas del Rosario en Cartagena',
        ],
        program_inclusions: [
          '9 noches hotel 4*',
          'Desayunos diarios',
          'Traslados privados',
          'Guía bilingüe',
        ],
        program_exclusions: ['Tiquetes aéreos internacionales', 'Propinas', 'Bebidas alcohólicas'],
        program_notes: 'Se recomienda llevar ropa ligera y zapatos cómodos para caminar.',
        program_meeting_info: 'Punto de encuentro: lobby del Hotel Tequendama, Bogotá, 08:00.',
        cover_image_url: 'https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?w=1200',
        video_url: 'https://www.youtube.com/watch?v=pilot_baseline_v1',
        video_caption: 'Colombia en 60 segundos — pilot baseline',
        description_ai_generated: false,
        highlights_ai_generated: false,
      };
    case 'translation-ready':
      return {
        name: 'Colombia Bilingual Journey — translation-ready',
        description: DESCRIPTION_TRANSLATION,
        program_highlights: [
          'Visita guiada bilingüe al Museo Botero',
          'Experiencia cafetera con traducción inglés/español',
          'City tour amurallado de Cartagena con dos idiomas',
        ],
        program_inclusions: [
          'Alojamiento boutique bilingüe',
          'Guía certificado EN/ES',
          'Material impreso bilingüe',
        ],
        program_exclusions: ['Gastos personales', 'Tours opcionales'],
        program_notes: 'Traducción simultánea disponible bajo solicitud.',
        program_meeting_info: 'Meeting point: Hotel Sofitel Legend Santa Clara, Cartagena. 09:00.',
        cover_image_url: 'https://images.unsplash.com/photo-1534008897995-27a23e859048?w=1200',
        video_url: 'https://www.youtube.com/watch?v=pilot_translation_v1',
        video_caption: 'Bilingual journey teaser',
        description_ai_generated: false,
        highlights_ai_generated: false,
      };
    case 'empty-state':
      return {
        name: 'Colombia Empty State Fixture',
        description: null,
        program_highlights: [],
        program_inclusions: [],
        program_exclusions: [],
        program_notes: null,
        program_meeting_info: null,
        cover_image_url: null,
        video_url: null,
        video_caption: null,
        description_ai_generated: false,
        highlights_ai_generated: false,
      };
    case 'missing-locale':
      return {
        // Base row only has es-CO content populated; EN gap verified via
        // absence of a published transcreation job for this slug (the spec
        // asserts the UI surfaces the gap with "Translate with AI" CTA).
        name: 'Colombia Missing Locale Fixture',
        description:
          'Este paquete sólo tiene contenido en español — la cobertura en inglés debe aparecer como “missing” en la matriz de traducción.',
        program_highlights: ['Contenido solo en español', 'Cobertura EN pendiente'],
        program_inclusions: ['Contenido ES listo'],
        program_exclusions: [],
        program_notes: null,
        program_meeting_info: null,
        cover_image_url: null,
        video_url: null,
        video_caption: null,
        description_ai_generated: false,
        highlights_ai_generated: false,
      };
  }
}

function activityTemplateFor(variant: PilotSeedVariant): ActivityTemplate {
  switch (variant) {
    case 'baseline':
      return {
        name: 'City Tour Cartagena — Pilot baseline',
        description:
          'Recorrido a pie de 3 horas por la Ciudad Amurallada de Cartagena con un guía local certificado. Incluye Plaza Santo Domingo, Iglesia de San Pedro Claver y mirador del Café del Mar.',
        program_highlights: [
          'Ciudad amurallada al atardecer',
          'Plaza de los Coches y Torre del Reloj',
          'Mirador del Café del Mar',
        ],
        program_inclusions: ['Guía certificado', 'Agua embotellada'],
        program_exclusions: ['Propinas', 'Comidas'],
        cover_image_url: 'https://images.unsplash.com/photo-1551293317-2b9fca0f86ec?w=1200',
      };
    case 'translation-ready':
      return {
        name: 'Cartagena Bilingual Walking Tour',
        description:
          'Descubre Cartagena con un guía bilingüe (ES/EN). Tour de 3 horas por los rincones más icónicos de la ciudad amurallada, con historias bilingües sobre la Colombia colonial.',
        program_highlights: [
          'Relato bilingüe español/inglés',
          'Plazas coloniales con contexto histórico',
          'Puesta de sol en las murallas',
        ],
        program_inclusions: ['Guía bilingüe', 'Mapa impreso', 'Audio tour opcional'],
        program_exclusions: ['Propinas'],
        cover_image_url: 'https://images.unsplash.com/photo-1563492527756-9edef1a5a5e6?w=1200',
      };
    case 'empty-state':
      return {
        name: 'Activity Empty State',
        description: null,
        program_highlights: [],
        program_inclusions: [],
        program_exclusions: [],
        cover_image_url: null,
      };
    case 'missing-locale':
      return {
        name: 'Actividad solo español',
        description: 'Actividad con contenido sólo en español para coverage gap.',
        program_highlights: ['Sólo ES'],
        program_inclusions: [],
        program_exclusions: [],
        cover_image_url: null,
      };
  }
}

function blogTemplateFor(variant: PilotSeedVariant): BlogTemplate {
  switch (variant) {
    case 'baseline':
      return {
        title: 'Cinco razones para viajar a Colombia este año',
        excerpt: 'Una guía breve de por qué Colombia es el destino ideal para el 2026.',
        content:
          '# Colombia 2026\n\nColombia ofrece cinco motivos imperdibles para planear tu próximo viaje: biodiversidad, café premium, playas caribeñas, ciudades coloniales y gente cálida. Este artículo resume la propuesta para viajeros que buscan autenticidad y comodidad.\n\n## Biodiversidad\nColombia es el segundo país más biodiverso del mundo.\n\n## Café\nEl Eje Cafetero produce café premium reconocido internacionalmente.',
        locale: 'es-CO',
        status: 'published',
      };
    case 'translation-ready':
      return {
        title: 'Guía bilingüe para visitar Cartagena',
        excerpt:
          'Todo lo que necesitas saber antes de viajar a Cartagena, con equivalencias en inglés.',
        content:
          '# Cartagena bilingüe\n\nCartagena de Indias es una ciudad colonial del Caribe colombiano. Esta guía está pensada para viajeros que quieran tener contenido paralelo en inglés y español.\n\n## Qué hacer\n- Recorrer la Ciudad Amurallada.\n- Visitar Islas del Rosario.\n- Cenar en Getsemaní.\n\n## When to go\nLa mejor temporada es diciembre-marzo, con clima seco y temperaturas templadas.',
        locale: 'es-CO',
        status: 'published',
      };
    case 'empty-state':
      return {
        title: 'Empty blog post',
        excerpt: null,
        content: '',
        locale: 'es-CO',
        status: 'draft',
      };
    case 'missing-locale':
      return {
        title: 'Blog sólo en español',
        excerpt: 'Cobertura en inglés pendiente.',
        content:
          '# Blog solo ES\n\nEste post existe solamente en español. La matriz de traducción debe marcar la celda en-US como missing para este contenido.',
        locale: 'es-CO',
        status: 'published',
      };
  }
}

function overlayTemplateFor(variant: PilotSeedVariant): OverlayTemplate {
  switch (variant) {
    case 'baseline':
      return {
        custom_hero: {
          title: 'Colombia Clásica — una experiencia curada',
          subtitle: 'Bogotá, Eje Cafetero y Cartagena en 10 días',
          backgroundImage: 'https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?w=1600',
        },
        custom_sections: [
          {
            id: 'pilot-text-1',
            type: 'text',
            position: 0,
            content: { html: '<p>Texto personalizado — seed baseline pilot.</p>' },
          },
          {
            id: 'pilot-cta-1',
            type: 'cta',
            position: 1,
            content: {
              label: 'Reservar por WhatsApp',
              href: 'https://wa.me/573000000000',
              variant: 'primary',
            },
          },
        ],
        sections_order: ['hero', 'highlights', 'description', 'gallery', 'inclusions'],
        hidden_sections: ['reviews'],
        custom_seo_title: 'Colombia Clásica 10 días — Pilot SEO baseline',
        custom_seo_description:
          'Descubre Colombia con un itinerario de 10 días curado: Bogotá, Eje Cafetero y Cartagena. Hoteles 4*, guía bilingüe, traslados privados.',
        custom_faq: [
          {
            question: '¿Qué incluye el paquete?',
            answer: '9 noches en hoteles 4*, desayunos diarios, traslados privados y guía bilingüe.',
          },
          {
            question: '¿Se necesita visa?',
            answer:
              'La mayoría de pasaportes europeos y latinoamericanos no requieren visa para visitas turísticas a Colombia de hasta 90 días.',
          },
        ],
      };
    case 'translation-ready':
      return {
        custom_hero: {
          title: 'Bilingual Journey through Colombia',
          subtitle: 'Doble cobertura ES/EN para cada etapa del viaje',
          backgroundImage: 'https://images.unsplash.com/photo-1534008897995-27a23e859048?w=1600',
        },
        custom_sections: [
          {
            id: 'pilot-text-bilingual',
            type: 'text',
            position: 0,
            content: { html: '<p>Contenido bilingüe listo para transcreate.</p>' },
          },
        ],
        sections_order: ['hero', 'highlights', 'description', 'faq'],
        hidden_sections: [],
        custom_seo_title: 'Bilingual Colombia Journey — ES/EN transcreate ready',
        custom_seo_description:
          'Plan your bilingual trip to Colombia. Designed for ES/EN transcreate workflow with parity content in both locales.',
        custom_faq: [
          {
            question: '¿El guía habla inglés?',
            answer: 'Sí, todos nuestros guías son bilingües certificados ES/EN.',
          },
        ],
      };
    case 'empty-state':
      return {
        custom_hero: null,
        custom_sections: [],
        sections_order: [],
        hidden_sections: [],
        custom_seo_title: null,
        custom_seo_description: null,
        custom_faq: [],
      };
    case 'missing-locale':
      return {
        custom_hero: {
          title: 'Sólo español',
          subtitle: 'Cobertura EN pendiente',
          backgroundImage: null,
        },
        custom_sections: [],
        sections_order: ['hero', 'description'],
        hidden_sections: [],
        custom_seo_title: 'Sólo español — pilot missing-locale',
        custom_seo_description: 'Este paquete aún no tiene cobertura en inglés.',
        custom_faq: [],
      };
  }
}

// --- Upsert helpers ---------------------------------------------------------

/**
 * Select-first-then-update (fix mirroring PR #233) to work around
 * `set_package_kit_slug` BEFORE-INSERT trigger that would otherwise append
 * `-2`, `-3` suffixes on every onConflict=slug insert and break the canonical
 * slug contract.
 */
async function upsertPackage(
  accountId: string,
  slug: string,
  tpl: PackageTemplate,
  warnings: string[],
): Promise<string | null> {
  const patch = {
    account_id: accountId,
    slug,
    name: tpl.name,
    description: tpl.description,
    description_ai_generated: tpl.description_ai_generated,
    program_highlights: tpl.program_highlights,
    highlights_ai_generated: tpl.highlights_ai_generated,
    program_inclusions: tpl.program_inclusions,
    program_exclusions: tpl.program_exclusions,
    program_notes: tpl.program_notes,
    program_meeting_info: tpl.program_meeting_info,
    program_gallery: [],
    cover_image_url: tpl.cover_image_url,
    video_url: tpl.video_url,
    video_caption: tpl.video_caption,
    last_edited_by_surface: 'studio',
  };

  const { data: existing, error: readError } = await admin
    .from('package_kits')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (readError) {
    warnings.push(`pilot: package_kits read (${slug}) failed: ${errorMessage(readError)}`);
    return null;
  }

  if (existing?.id) {
    const { error: upError } = await admin.from('package_kits').update(patch).eq('id', existing.id);
    if (upError) {
      warnings.push(`pilot: package_kits update (${slug}) failed: ${errorMessage(upError)}`);
    }
    return String(existing.id);
  }

  const { data: inserted, error: insertError } = await admin
    .from('package_kits')
    .insert(patch)
    .select('id')
    .maybeSingle();
  if (insertError || !inserted?.id) {
    warnings.push(`pilot: package_kits insert (${slug}) failed: ${errorMessage(insertError)}`);
    return null;
  }
  return String(inserted.id);
}

async function upsertActivity(
  accountId: string,
  slug: string,
  tpl: ActivityTemplate,
  warnings: string[],
): Promise<string | null> {
  const patch: Record<string, unknown> = {
    account_id: accountId,
    slug,
    name: tpl.name,
    description: tpl.description,
    program_highlights: tpl.program_highlights,
    program_inclusions: tpl.program_inclusions,
    program_exclusions: tpl.program_exclusions,
    cover_image_url: tpl.cover_image_url,
    last_edited_by_surface: 'studio',
  };

  const { data: existing, error: readError } = await admin
    .from('activities')
    .select('id')
    .eq('slug', slug)
    .eq('account_id', accountId)
    .maybeSingle();

  if (readError) {
    warnings.push(`pilot: activities read (${slug}) failed: ${errorMessage(readError)}`);
    return null;
  }

  if (existing?.id) {
    const { error: upError } = await admin
      .from('activities')
      .update(patch)
      .eq('id', existing.id);
    if (upError) {
      warnings.push(`pilot: activities update (${slug}) failed: ${errorMessage(upError)}`);
    }
    return String(existing.id);
  }

  const { data: inserted, error: insertError } = await admin
    .from('activities')
    .insert(patch)
    .select('id')
    .maybeSingle();
  if (insertError || !inserted?.id) {
    warnings.push(`pilot: activities insert (${slug}) failed: ${errorMessage(insertError)}`);
    return null;
  }
  return String(inserted.id);
}

async function upsertPackageItinerary(
  accountId: string,
  packageId: string,
  name: string,
  warnings: string[],
): Promise<string | null> {
  // If the package already has source_itinerary_id, reuse it (idempotent).
  const { data: kitRow } = await admin
    .from('package_kits')
    .select('source_itinerary_id')
    .eq('id', packageId)
    .maybeSingle();

  if (kitRow?.source_itinerary_id) return String(kitRow.source_itinerary_id);

  const { data: byName } = await admin
    .from('itineraries')
    .select('id')
    .eq('account_id', accountId)
    .eq('name', name)
    .is('deleted_at', null)
    .maybeSingle();

  if (byName?.id) {
    await admin
      .from('package_kits')
      .update({ source_itinerary_id: byName.id })
      .eq('id', packageId);
    return String(byName.id);
  }

  const today = new Date();
  const oneMonthLater = new Date(today.getTime() + 30 * 24 * 3600 * 1000);
  const toDate = (d: Date) => d.toISOString().slice(0, 10);

  const { data: inserted, error } = await admin
    .from('itineraries')
    .insert({
      account_id: accountId,
      name,
      start_date: toDate(today),
      end_date: toDate(oneMonthLater),
      passenger_count: 1,
      status: 'draft',
      source_package_id: packageId,
      itinerary_visibility: true,
    })
    .select('id')
    .maybeSingle();

  if (error || !inserted?.id) {
    warnings.push(
      `pilot: itineraries insert (pkg=${packageId}) failed: ${errorMessage(error)}`,
    );
    return null;
  }

  await admin
    .from('package_kits')
    .update({ source_itinerary_id: inserted.id })
    .eq('id', packageId);

  return String(inserted.id);
}

async function upsertProductOverlay(
  websiteId: string,
  productType: 'package' | 'activity',
  productId: string,
  overlay: OverlayTemplate,
  warnings: string[],
): Promise<string | null> {
  const row = {
    website_id: websiteId,
    product_type: productType,
    product_id: productId,
    locale: 'es-CO',
    is_published: true,
    robots_noindex: false,
    translation_group_id: productId,
    custom_hero: overlay.custom_hero,
    custom_sections: overlay.custom_sections,
    sections_order: overlay.sections_order,
    hidden_sections: overlay.hidden_sections,
    custom_seo_title: overlay.custom_seo_title,
    custom_seo_description: overlay.custom_seo_description,
    custom_faq: overlay.custom_faq,
    seo_highlights: [] as unknown[],
    seo_faq: [] as unknown[],
    custom_highlights: [] as unknown[],
    source: 'pilot-seed',
    confidence: 'live',
  };

  const { data, error } = await admin
    .from('website_product_pages')
    .upsert(row, { onConflict: 'website_id,locale,product_type,product_id' })
    .select('id')
    .maybeSingle();

  if (error) {
    warnings.push(
      `pilot: website_product_pages upsert (${productType}/${productId}) failed: ${errorMessage(error)}`,
    );
    return null;
  }
  return data?.id ? String(data.id) : null;
}

async function upsertBlogPost(
  websiteId: string,
  slug: string,
  tpl: BlogTemplate,
  warnings: string[],
): Promise<string | null> {
  // Public SELECT RLS on `website_blog_posts` requires `published_at <= now()`
  // AND `status = 'published'`. Without an explicit `published_at`, published
  // seeds are invisible to the anon SSR client and `/blog/{slug}` 404s even
  // though the blog listing (SECURITY DEFINER RPC) shows the row.
  // Stage 6 Bug 13 fix — always stamp published_at for published seeds so
  // the detail page round-trips under anon + pilot matrix renders.
  const publishedAt = tpl.status === 'published' ? new Date().toISOString() : null;

  // `translation_group_id` is NOT NULL — self-reference for the canonical
  // post keeps the blog seed independent of an external group. Fetch the
  // existing row (if any) so idempotent re-runs preserve the same UUID
  // instead of generating a fresh one every call.
  const { data: existing } = await admin
    .from('website_blog_posts')
    .select('id, translation_group_id')
    .eq('website_id', websiteId)
    .eq('slug', slug)
    .eq('locale', tpl.locale)
    .maybeSingle();
  const translationGroupId =
    existing?.translation_group_id
    ?? existing?.id
    ?? (typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`);

  const { data, error } = await admin
    .from('website_blog_posts')
    .upsert(
      {
        website_id: websiteId,
        slug,
        title: tpl.title,
        excerpt: tpl.excerpt,
        content: tpl.content,
        status: tpl.status,
        locale: tpl.locale,
        published_at: publishedAt,
        translation_group_id: translationGroupId,
      },
      { onConflict: 'website_id,slug,locale' },
    )
    .select('id')
    .maybeSingle();

  if (error) {
    warnings.push(`pilot: website_blog_posts upsert (${slug}) failed: ${errorMessage(error)}`);
    return null;
  }
  return data?.id ? String(data.id) : null;
}

// --- Public API -------------------------------------------------------------

/**
 * Idempotent pilot seed for a specific variant. Safe to call from many specs —
 * the result is memoised per variant per process.
 *
 * Returns the fixture IDs the tests need. Warnings (non-fatal soft failures)
 * are surfaced so the caller can decide whether to `test.skip()` with context.
 */
export async function seedPilot(variant: PilotSeedVariant): Promise<PilotSeedResult> {
  const cached = variantCache.get(variant);
  if (cached) return cached;

  const promise = (async (): Promise<PilotSeedResult> => {
    assertSeedEnvAllowsMutation();
    const base = await seedTestData();
    const accountId = String(base.account.id);
    const websiteId = String(base.website.id);
    const subdomain = String(base.website.subdomain);
    const warnings: string[] = [];

    const s = slugs(variant);
    const packageTpl = packageTemplateFor(variant);
    const activityTpl = activityTemplateFor(variant);
    const blogTpl = blogTemplateFor(variant);
    const overlayTpl = overlayTemplateFor(variant);

    // 1. Package
    const packageId = await upsertPackage(accountId, s.package, packageTpl, warnings);

    // 2. Itinerary + package overlay (required by `get_website_product_page` RPC
    //    so `/site/<sub>/paquetes/<slug>` resolves to 200).
    let packageItineraryId: string | null = null;
    let packageProductPageId: string | null = null;
    if (packageId) {
      packageItineraryId = await upsertPackageItinerary(
        accountId,
        packageId,
        `Pilot ColombiaTours ${variant}`,
        warnings,
      );
      if (packageItineraryId) {
        packageProductPageId = await upsertProductOverlay(
          websiteId,
          'package',
          packageItineraryId,
          overlayTpl,
          warnings,
        );
      }
    }

    // 3. Activity + overlay (for activity-parity spec).
    const activityId = await upsertActivity(accountId, s.activity, activityTpl, warnings);
    let activityProductPageId: string | null = null;
    if (activityId) {
      activityProductPageId = await upsertProductOverlay(
        websiteId,
        'activity',
        activityId,
        overlayTpl,
        warnings,
      );
    }

    // 4. Blog post
    const blogId = await upsertBlogPost(websiteId, s.blog, blogTpl, warnings);

    return {
      variant,
      accountId,
      websiteId,
      subdomain,
      packages: packageId
        ? [
            {
              id: packageId,
              slug: s.package,
              itineraryId: packageItineraryId,
              productPageId: packageProductPageId,
            },
          ]
        : [],
      activities: activityId
        ? [{ id: activityId, slug: s.activity, productPageId: activityProductPageId }]
        : [],
      blogPosts: blogId ? [{ id: blogId, slug: s.blog, locale: blogTpl.locale }] : [],
      warnings,
    };
  })().catch((error) => {
    variantCache.delete(variant);
    throw error;
  });

  variantCache.set(variant, promise);
  return promise;
}

/**
 * Narrow cleanup — deletes only `pilot-colombiatours-*` rows scoped to the
 * seed website + account. Never truncates.
 *
 * Invoked by specs that need a clean slate (suite `beforeAll`) — NOT in
 * `afterAll` so a crashed spec leaves fixtures for forensic inspection.
 */
export async function cleanupPilotSeed(websiteId: string): Promise<void> {
  const accountId = (await seedTestData()).account.id;

  // website_product_pages — join through itineraries (package) + activities.
  const { data: pkgRows } = await admin
    .from('package_kits')
    .select('id, source_itinerary_id')
    .eq('account_id', accountId)
    .like('slug', `${SLUG_NS}-%`);

  const itineraryIds = (pkgRows ?? [])
    .map((r) => r.source_itinerary_id)
    .filter((id): id is string => Boolean(id));

  const { data: actRows } = await admin
    .from('activities')
    .select('id')
    .eq('account_id', accountId)
    .like('slug', `${SLUG_NS}-%`);
  const activityIds = (actRows ?? []).map((r) => String(r.id));

  // Overlays: package overlays keyed by itinerary_id; activities by activity id.
  const overlayIds = [...itineraryIds, ...activityIds];
  if (overlayIds.length > 0) {
    await admin
      .from('website_product_pages')
      .delete()
      .eq('website_id', websiteId)
      .in('product_id', overlayIds);
  }

  // Transcreation jobs scoped to the same page ids.
  const pageIds = [
    ...(pkgRows ?? []).map((r) => String(r.id)),
    ...itineraryIds,
    ...activityIds,
  ];
  if (pageIds.length > 0) {
    await admin
      .from('seo_transcreation_jobs')
      .delete()
      .eq('website_id', websiteId)
      .in('page_id', pageIds);
  }

  // Blog posts
  await admin
    .from('website_blog_posts')
    .delete()
    .eq('website_id', websiteId)
    .like('slug', `${SLUG_NS}-%`);

  // Packages + activities (deleted last, AFTER overlays).
  await admin
    .from('package_kits')
    .delete()
    .eq('account_id', accountId)
    .like('slug', `${SLUG_NS}-%`);
  await admin
    .from('activities')
    .delete()
    .eq('account_id', accountId)
    .like('slug', `${SLUG_NS}-%`);

  // Itineraries last (FK target). Narrow to our pilot namespace via name prefix.
  if (itineraryIds.length > 0) {
    await admin
      .from('itineraries')
      .delete()
      .eq('account_id', accountId)
      .in('id', itineraryIds);
  }

  // Reset the in-process memoisation so the next caller re-seeds fresh.
  variantCache.clear();
}
