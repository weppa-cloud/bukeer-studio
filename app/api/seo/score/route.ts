import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { scoreItemSeo, type SeoScoringInput, type SeoItemType } from '@/lib/seo/unified-scorer';
import { Score5DResultSchema, type Score5DResult } from '@/lib/seo/dto';
import { SeoApiError, toErrorResponse } from '@/lib/seo/errors';

// ─── Query param schema ───────────────────────────────────────────────────────

const querySchema = z.object({
  websiteId: z.string().uuid(),
  itemType: z.enum(['hotel', 'activity', 'transfer', 'package', 'destination', 'blog', 'page']),
  itemId: z.string().uuid(),
  locale: z.string().default('es-CO'),
});

// ─── DB row types ─────────────────────────────────────────────────────────────

interface HotelRow {
  id: string;
  name: string | null;
  description: string | null;
  main_image: string | null;
  slug: string | null;
  star_rating: number | null;
  user_rating: number | null;
  amenities: string[] | null;
  check_in_time: string | null;
  check_out_time: string | null;
  inclutions: string | null;
  exclutions: string | null;
  recomendations: string | null;
}

interface ActivityRow {
  id: string;
  name: string | null;
  description: string | null;
  main_image: string | null;
  slug: string | null;
  duration_minutes: number | null;
  inclutions: string | null;
  exclutions: string | null;
  experience_type: string | null;
}

interface TransferRow {
  id: string;
  name: string | null;
  description: string | null;
  main_image: string | null;
  slug: string | null;
}

interface PackageRow {
  id: string;
  name: string | null;
  description: string | null;
  slug: string | null;
}

interface BlogRow {
  id: string;
  seo_title: string | null;
  seo_description: string | null;
  content: string | null;
  main_image: string | null;
  slug: string | null;
}

interface PageRow {
  id: string;
  name: string | null;
  slug: string | null;
}

interface SeoOverrideRow {
  seo_title: string | null;
  seo_description: string | null;
  target_keyword: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function mentionsPricing(text: string | null | undefined): boolean {
  if (!text) return false;
  return /\$|precio|tarif|USD|COP|MXN|EUR|\d+\s*(usd|cop|mxn)/i.test(text);
}

/** Normalize a dimension score (0-100%) to a /20 scale. */
function normalizeTo20(percent: number): number {
  return Math.round((percent / 100) * 20);
}

function gradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function gradeForDim(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  // score here is /20
  return gradeFromScore((score / 20) * 100);
}

// ─── D4 Conversion calculation ────────────────────────────────────────────────

function calcD4Conversion(input: {
  image: string | undefined;
  description: string | undefined;
  amenities: string[] | undefined;
  inclusions: string | undefined;
  slug: string;
}): { score: number; details: string[] } {
  let score = 0;
  const details: string[] = [];

  // Image presence: up to 8 pts
  if (input.image) {
    score += 8;
    details.push('Imagen principal presente (+8)');
  } else {
    details.push('Sin imagen principal — reduce conversion');
  }

  // Pricing signals: up to 6 pts
  const hasPricingInDesc = mentionsPricing(input.description);
  const hasPricingInSlug = mentionsPricing(input.slug);
  if (hasPricingInDesc || hasPricingInSlug) {
    score += 6;
    details.push('Señales de precio en contenido (+6)');
  } else {
    details.push('Sin menciones de precio — agrega CTA con precio');
  }

  // Amenities / inclusions: up to 6 pts
  const amenitiesCount = input.amenities?.length ?? 0;
  const hasInclusions = (input.inclusions?.length ?? 0) >= 30;
  if (amenitiesCount >= 5 || hasInclusions) {
    score += 6;
    details.push('Amenidades o inclusiones detalladas (+6)');
  } else if (amenitiesCount >= 2 || (input.inclusions?.length ?? 0) >= 10) {
    score += 3;
    details.push('Algunas amenidades/inclusiones (+3) — amplía para mejorar conversión');
  } else {
    details.push('Sin amenidades ni inclusiones — agrega detalles de valor');
  }

  return { score: Math.min(score, 20), details };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Parse & validate query params
    const url = new URL(req.url);
    const parseResult = querySchema.safeParse({
      websiteId: url.searchParams.get('websiteId'),
      itemType: url.searchParams.get('itemType'),
      itemId: url.searchParams.get('itemId'),
      locale: url.searchParams.get('locale') ?? 'es-CO',
    });

    if (!parseResult.success) {
      throw new SeoApiError('VALIDATION_ERROR', 'Invalid query parameters', 400, parseResult.error.flatten());
    }

    const { websiteId, itemType, itemId, locale } = parseResult.data;

    // 2. Auth check (uses createSupabaseServerClient internally)
    await requireWebsiteAccess(websiteId);

    // 3. Fetch item row via service role (bypasses RLS, auth already verified above)
    const adminClient = createSupabaseServiceRoleClient();

    let name = '';
    let description: string | undefined;
    let image: string | undefined;
    let slug = '';
    let seoTitle: string | undefined;
    let seoDescription: string | undefined;
    let amenities: string[] | undefined;
    let starRating: number | undefined;
    let duration: number | undefined;
    let inclusions: string | undefined;
    let wordCount = 0;

    switch (itemType) {
      case 'hotel': {
        const { data, error } = await adminClient
          .from('hotels')
          .select('id, name, description, main_image, slug, star_rating, user_rating, amenities, check_in_time, check_out_time, inclutions, exclutions, recomendations')
          .eq('id', itemId)
          .single<HotelRow>();
        if (error || !data) throw new SeoApiError('VALIDATION_ERROR', 'Hotel not found', 404);
        name = data.name ?? '';
        description = data.description ?? undefined;
        image = data.main_image ?? undefined;
        slug = data.slug ?? itemId;
        starRating = data.star_rating ?? undefined;
        amenities = data.amenities ?? undefined;
        inclusions = data.inclutions ?? undefined;
        wordCount = countWords(data.description);
        break;
      }

      case 'activity': {
        const { data, error } = await adminClient
          .from('activities')
          .select('id, name, description, main_image, slug, duration_minutes, inclutions, exclutions, experience_type')
          .eq('id', itemId)
          .single<ActivityRow>();
        if (error || !data) throw new SeoApiError('VALIDATION_ERROR', 'Activity not found', 404);
        name = data.name ?? '';
        description = data.description ?? undefined;
        image = data.main_image ?? undefined;
        slug = data.slug ?? itemId;
        duration = data.duration_minutes ?? undefined;
        inclusions = data.inclutions ?? undefined;
        wordCount = countWords(data.description);
        break;
      }

      case 'transfer': {
        const { data, error } = await adminClient
          .from('transfers')
          .select('id, name, description, main_image, slug')
          .eq('id', itemId)
          .single<TransferRow>();
        if (error || !data) throw new SeoApiError('VALIDATION_ERROR', 'Transfer not found', 404);
        name = data.name ?? '';
        description = data.description ?? undefined;
        image = data.main_image ?? undefined;
        slug = data.slug ?? itemId;
        wordCount = countWords(data.description);
        break;
      }

      case 'package': {
        const { data, error } = await adminClient
          .from('package_kits')
          .select('id, name, description, slug')
          .eq('id', itemId)
          .single<PackageRow>();
        if (error || !data) throw new SeoApiError('VALIDATION_ERROR', 'Package not found', 404);
        name = data.name ?? '';
        description = data.description ?? undefined;
        slug = data.slug ?? itemId;
        wordCount = countWords(data.description);
        break;
      }

      case 'destination': {
        // Try seo_overrides table first, then fall back to basic fields
        const { data } = await adminClient
          .from('destination_seo_overrides')
          .select('*')
          .eq('id', itemId)
          .maybeSingle();
        name = (data as Record<string, unknown> | null)?.['name'] as string ?? 'Destino';
        description = (data as Record<string, unknown> | null)?.['description'] as string | undefined;
        slug = (data as Record<string, unknown> | null)?.['slug'] as string ?? itemId;
        wordCount = countWords(description);
        break;
      }

      case 'blog': {
        const { data, error } = await adminClient
          .from('website_blog_posts')
          .select('id, seo_title, seo_description, content, main_image, slug')
          .eq('id', itemId)
          .single<BlogRow>();
        if (error || !data) throw new SeoApiError('VALIDATION_ERROR', 'Blog post not found', 404);
        name = data.seo_title ?? 'Blog post';
        description = data.content ?? undefined;
        image = data.main_image ?? undefined;
        slug = data.slug ?? itemId;
        seoTitle = data.seo_title ?? undefined;
        seoDescription = data.seo_description ?? undefined;
        wordCount = countWords(data.content);
        break;
      }

      case 'page': {
        const { data, error } = await adminClient
          .from('website_pages')
          .select('id, name, slug')
          .eq('id', itemId)
          .single<PageRow>();
        if (error || !data) throw new SeoApiError('VALIDATION_ERROR', 'Page not found', 404);
        name = data.name ?? '';
        slug = data.slug ?? itemId;
        break;
      }
    }

    // 4. Read SEO overrides from website_product_pages
    const { data: seoOverride } = await adminClient
      .from('website_product_pages')
      .select('seo_title, seo_description, target_keyword')
      .eq('product_id', itemId)
      .eq('website_id', websiteId)
      .maybeSingle<SeoOverrideRow>();

    if (seoOverride) {
      seoTitle = seoOverride.seo_title ?? seoTitle;
      seoDescription = seoOverride.seo_description ?? seoDescription;
    }
    const targetKeyword = seoOverride?.target_keyword ?? undefined;

    // 5. Build SeoScoringInput
    const scoringInput: SeoScoringInput = {
      type: itemType as SeoItemType,
      name,
      slug,
      description,
      image,
      seoTitle,
      seoDescription,
      targetKeyword,
      wordCount,
      amenities,
      starRating,
      duration,
      inclusions,
      hasJsonLd: Boolean(name) && (Boolean(description) || Boolean(seoTitle) || Boolean(image)),
      hasCanonical: false,
      hasHreflang: false,
      hasOgTags: true,
      hasTwitterCard: true,
    };

    console.log('[seo.scorer] Scoring item', { itemType, itemId, locale, wordCount });

    // 6. Run unified scorer
    const scorerResult = scoreItemSeo(scoringInput);

    // 7. Calculate 5D scores
    // D1 On-Page: meta dimension normalized to /20
    const d1Score = normalizeTo20(scorerResult.dimensions.meta);

    // D2 Semantic: content dimension normalized to /20
    const d2Score = normalizeTo20(scorerResult.dimensions.content);

    // D3 Schema: technical dimension normalized to /20
    const d3Score = normalizeTo20(scorerResult.dimensions.technical);

    // D4 Conversion: computed from image, pricing signals, amenities/inclusions
    const d4Calc = calcD4Conversion({ image, description, amenities, inclusions, slug });
    const d4Score = d4Calc.score;

    // D5 Competitive: always 0 until real GSC integration
    const d5Score = 0;

    // Build check message details grouped by dimension
    const metaDetails = scorerResult.checks
      .filter((c) => c.dimension === 'meta' && !c.pass)
      .map((c) => c.message);
    const contentDetails = scorerResult.checks
      .filter((c) => c.dimension === 'content' && !c.pass)
      .map((c) => c.message);
    const technicalDetails = scorerResult.checks
      .filter((c) => c.dimension === 'technical' && !c.pass)
      .map((c) => c.message);

    const result: Score5DResult = Score5DResultSchema.parse({
      d1: {
        score: (d1Score / 20) * 100,
        grade: gradeForDim(d1Score),
        details: metaDetails,
      },
      d2: {
        score: (d2Score / 20) * 100,
        grade: gradeForDim(d2Score),
        details: contentDetails,
      },
      d3: {
        score: (d3Score / 20) * 100,
        grade: gradeForDim(d3Score),
        details: technicalDetails,
      },
      d4: {
        score: (d4Score / 20) * 100,
        grade: gradeForDim(d4Score),
        details: d4Calc.details,
      },
      d5: {
        score: 0,
        grade: 'F',
        details: ['Integración GSC pendiente — datos competitivos no disponibles'],
      },
    });

    // Overall score weighted (d1-d4 each /20, d5 excluded from average until ready)
    const overall = Math.round(
      ((d1Score + d2Score + d3Score + d4Score) / 80) * 100
    );

    console.log('[seo.scorer] Done', { itemType, itemId, overall });

    return NextResponse.json({
      ...result,
      overall,
      grade: gradeFromScore(overall),
      scorerChecks: scorerResult.checks,
      recommendations: scorerResult.recommendations,
      locale,
    });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
