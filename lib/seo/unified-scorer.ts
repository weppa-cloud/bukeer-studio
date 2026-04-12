/**
 * Unified SEO Scorer — 22 checks, 3 dimensions, A-F grading
 *
 * COMPLEMENTARY to existing scorers:
 * - lib/blog/content-scorer.ts — 21 checks for blog content quality
 * - lib/studio/score-page-content.ts — 15 checks for page sections
 *
 * This scorer evaluates SEO metadata quality and technical SEO signals
 * that existing scorers don't cover: JSON-LD, hreflang, canonical,
 * duplicates, URL structure, OG/Twitter cards.
 *
 * Pure function, no side effects, no DB calls.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type SeoItemType =
  | 'hotel'
  | 'activity'
  | 'transfer'
  | 'package'
  | 'destination'
  | 'page'
  | 'blog';

export interface SeoScoringInput {
  type: SeoItemType;
  name: string;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  description?: string;
  image?: string;
  images?: string[];
  targetKeyword?: string;
  hasJsonLd: boolean;
  hasCanonical: boolean;
  hasHreflang: boolean;
  hasOgTags: boolean;
  hasTwitterCard: boolean;
  wordCount?: number;
  amenities?: string[];
  starRating?: number;
  duration?: number;
  inclusions?: string;
  itineraryItems?: number;
  latitude?: number;
  longitude?: number;
  enrichmentRating?: number;
  enrichmentDescription?: string;
}

export interface SeoCheck {
  id: string;
  dimension: 'meta' | 'content' | 'technical';
  pass: boolean;
  score: number; // points earned
  maxPoints: number;
  message: string;
}

export interface SeoScoringResult {
  overall: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  dimensions: { meta: number; content: number; technical: number };
  checks: SeoCheck[];
  recommendations: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function gradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

const WORD_COUNT_THRESHOLDS: Record<SeoItemType, { min: number; optimal: number }> = {
  hotel: { min: 150, optimal: 300 },
  activity: { min: 100, optimal: 250 },
  transfer: { min: 80, optimal: 150 },
  package: { min: 200, optimal: 400 },
  destination: { min: 200, optimal: 500 },
  page: { min: 300, optimal: 800 },
  blog: { min: 1500, optimal: 2100 },
};

function slugWordCount(slug: string): number {
  return slug.split(/[-_/]/).filter(Boolean).length;
}

function slugDepth(slug: string): number {
  return slug.split('/').filter(Boolean).length;
}

// ─── Main Scorer ────────────────────────────────────────────────────────────

export function scoreItemSeo(input: SeoScoringInput): SeoScoringResult {
  const checks: SeoCheck[] = [];
  const recommendations: string[] = [];

  // ═══ META DIMENSION (40% → 40 points max) ═══

  // #1: SEO title length (5-70 chars) — 8pts
  const titleLen = input.seoTitle?.length ?? 0;
  let titleScore = 0;
  if (titleLen >= 5 && titleLen <= 70) titleScore = 8;
  else if (titleLen > 70 && titleLen <= 80) titleScore = 5;
  else if (titleLen >= 1 && titleLen < 5) titleScore = 2;
  if (titleLen === 0) recommendations.push('Agrega un título SEO de entre 5 y 70 caracteres.');
  else if (titleLen > 70) recommendations.push('Reduce el título SEO a máximo 70 caracteres.');
  checks.push({
    id: 'meta_title_length', dimension: 'meta', maxPoints: 8,
    pass: titleLen >= 5 && titleLen <= 70, score: titleScore,
    message: titleLen > 0 ? `Título SEO: ${titleLen} chars (ideal: 5-70)` : 'Sin título SEO',
  });

  // #2: SEO description length (120-160 chars) — 8pts
  const descLen = input.seoDescription?.length ?? 0;
  let descScore = 0;
  if (descLen >= 120 && descLen <= 160) descScore = 8;
  else if (descLen >= 80 && descLen < 120) descScore = 5;
  else if (descLen > 160 && descLen <= 200) descScore = 4;
  else if (descLen > 0) descScore = 2;
  if (descLen === 0) recommendations.push('Agrega una meta descripción de 120-160 caracteres.');
  else if (descLen < 120) recommendations.push('Amplía la meta descripción a al menos 120 caracteres.');
  else if (descLen > 160) recommendations.push('Reduce la meta descripción a máximo 160 caracteres.');
  checks.push({
    id: 'meta_description_length', dimension: 'meta', maxPoints: 8,
    pass: descLen >= 120 && descLen <= 160, score: descScore,
    message: descLen > 0 ? `Meta descripción: ${descLen} chars (ideal: 120-160)` : 'Sin meta descripción',
  });

  // #3: Keyword in title — 5pts
  const keyword = input.targetKeyword?.toLowerCase() ?? '';
  const kwInTitle = keyword && input.seoTitle
    ? input.seoTitle.toLowerCase().includes(keyword)
    : false;
  let kwTitleScore = 0;
  if (!keyword) kwTitleScore = 3; // neutral if no keyword defined
  else if (kwInTitle) kwTitleScore = 5;
  if (keyword && !kwInTitle) recommendations.push('Incluye la keyword principal en el título SEO.');
  checks.push({
    id: 'keyword_in_title', dimension: 'meta', maxPoints: 5,
    pass: kwInTitle || !keyword, score: kwTitleScore,
    message: !keyword ? 'Sin keyword objetivo definida' : kwInTitle ? 'Keyword encontrada en título' : 'Keyword ausente del título',
  });

  // #4: Keyword in description — 3pts
  const kwInDesc = keyword && input.seoDescription
    ? input.seoDescription.toLowerCase().includes(keyword)
    : false;
  let kwDescScore = 0;
  if (!keyword) kwDescScore = 2;
  else if (kwInDesc) kwDescScore = 3;
  if (keyword && !kwInDesc) recommendations.push('Incluye la keyword principal en la meta descripción.');
  checks.push({
    id: 'keyword_in_description', dimension: 'meta', maxPoints: 3,
    pass: kwInDesc || !keyword, score: kwDescScore,
    message: !keyword ? 'Sin keyword objetivo definida' : kwInDesc ? 'Keyword en meta descripción' : 'Keyword ausente de meta descripción',
  });

  // #5: OG tags complete — 5pts
  const ogScore = input.hasOgTags ? 5 : 0;
  if (!input.hasOgTags) recommendations.push('Agrega Open Graph tags (og:title, og:description, og:image).');
  checks.push({
    id: 'og_tags', dimension: 'meta', maxPoints: 5,
    pass: input.hasOgTags, score: ogScore,
    message: input.hasOgTags ? 'OG tags presentes' : 'Faltan Open Graph tags',
  });

  // #6: Twitter card — 3pts
  const twitterScore = input.hasTwitterCard ? 3 : 0;
  if (!input.hasTwitterCard) recommendations.push('Agrega Twitter Card meta tags.');
  checks.push({
    id: 'twitter_card', dimension: 'meta', maxPoints: 3,
    pass: input.hasTwitterCard, score: twitterScore,
    message: input.hasTwitterCard ? 'Twitter Card presente' : 'Falta Twitter Card',
  });

  // #7: Canonical URL — 5pts
  const canonicalScore = input.hasCanonical ? 5 : 0;
  if (!input.hasCanonical) recommendations.push('Agrega URL canónica para evitar contenido duplicado.');
  checks.push({
    id: 'canonical_url', dimension: 'meta', maxPoints: 5,
    pass: input.hasCanonical, score: canonicalScore,
    message: input.hasCanonical ? 'Canonical URL presente' : 'Falta canonical URL',
  });

  // #8: Title uniqueness placeholder — 3pts
  // Without access to other titles, we check if title != name (minimal differentiation)
  const titleUnique = input.seoTitle ? input.seoTitle !== input.name : false;
  const uniqueScore = titleUnique ? 3 : input.seoTitle ? 1 : 0;
  if (input.seoTitle && !titleUnique) recommendations.push('Diferencia el título SEO del nombre genérico del item.');
  checks.push({
    id: 'title_uniqueness', dimension: 'meta', maxPoints: 3,
    pass: titleUnique, score: uniqueScore,
    message: titleUnique ? 'Título SEO diferenciado del nombre' : 'Título SEO igual al nombre — personalízalo',
  });

  // ═══ CONTENT DIMENSION (35% → 35 points max) ═══

  // #9: Has description — 8pts
  const hasDesc = !!input.description && input.description.trim().length > 0;
  const hasDescScore = hasDesc ? 8 : 0;
  if (!hasDesc) recommendations.push('Agrega una descripción de contenido.');
  checks.push({
    id: 'has_description', dimension: 'content', maxPoints: 8,
    pass: hasDesc, score: hasDescScore,
    message: hasDesc ? 'Descripción presente' : 'Sin descripción de contenido',
  });

  // #10: Word count by type — 5pts
  const wc = input.wordCount ?? 0;
  const thresholds = WORD_COUNT_THRESHOLDS[input.type];
  let wcScore = 0;
  if (wc >= thresholds.optimal) wcScore = 5;
  else if (wc >= thresholds.min) wcScore = 3;
  else if (wc > 0) wcScore = 1;
  if (wc < thresholds.min) {
    recommendations.push(`Amplía el contenido a al menos ${thresholds.min} palabras (óptimo: ${thresholds.optimal}+).`);
  }
  checks.push({
    id: 'word_count', dimension: 'content', maxPoints: 5,
    pass: wc >= thresholds.min, score: wcScore,
    message: `${wc} palabras (mín: ${thresholds.min}, óptimo: ${thresholds.optimal}+)`,
  });

  // #11: Main image — 5pts
  const hasMainImage = !!input.image;
  const mainImgScore = hasMainImage ? 5 : 0;
  if (!hasMainImage) recommendations.push('Agrega una imagen principal.');
  checks.push({
    id: 'main_image', dimension: 'content', maxPoints: 5,
    pass: hasMainImage, score: mainImgScore,
    message: hasMainImage ? 'Imagen principal presente' : 'Sin imagen principal',
  });

  // #12: Multiple images (for hotel/activity/package) — 3pts
  const needsMultipleImages = ['hotel', 'activity', 'package'].includes(input.type);
  const imageCount = input.images?.length ?? (hasMainImage ? 1 : 0);
  let multiImgScore = 0;
  if (!needsMultipleImages) {
    multiImgScore = 3; // N/A — full points
  } else if (imageCount >= 3) {
    multiImgScore = 3;
  } else if (imageCount >= 2) {
    multiImgScore = 2;
  } else if (imageCount >= 1) {
    multiImgScore = 1;
  }
  if (needsMultipleImages && imageCount < 3) {
    recommendations.push(`Agrega al menos 3 imágenes para ${input.type} (tienes ${imageCount}).`);
  }
  checks.push({
    id: 'multiple_images', dimension: 'content', maxPoints: 3,
    pass: !needsMultipleImages || imageCount >= 3, score: multiImgScore,
    message: needsMultipleImages
      ? `${imageCount} imágenes (recomendado: 3+)`
      : 'Múltiples imágenes no requeridas para este tipo',
  });

  // #13: Content richness by type — 7pts
  let richnessScore = 0;
  const richnessChecks: string[] = [];

  switch (input.type) {
    case 'hotel': {
      const hasAmenities = (input.amenities?.length ?? 0) >= 5;
      const hasStar = input.starRating != null;
      if (hasAmenities) richnessScore += 4;
      else richnessChecks.push('amenidades (mín 5)');
      if (hasStar) richnessScore += 3;
      else richnessChecks.push('clasificación por estrellas');
      break;
    }
    case 'activity': {
      const hasDuration = input.duration != null;
      const hasInclusions = (input.inclusions?.length ?? 0) >= 50;
      if (hasDuration) richnessScore += 4;
      else richnessChecks.push('duración');
      if (hasInclusions) richnessScore += 3;
      else richnessChecks.push('inclusiones (mín 50 chars)');
      break;
    }
    case 'package': {
      const hasItems = (input.itineraryItems ?? 0) >= 3;
      const hasImgs = (input.images?.length ?? 0) >= 3;
      if (hasItems) richnessScore += 4;
      else richnessChecks.push('items de itinerario (mín 3)');
      if (hasImgs) richnessScore += 3;
      else richnessChecks.push('imágenes (mín 3)');
      break;
    }
    case 'destination': {
      const hasEnrichment = !!input.enrichmentDescription;
      const hasGeo = input.latitude != null && input.longitude != null;
      if (hasEnrichment) richnessScore += 4;
      else richnessChecks.push('descripción enriquecida');
      if (hasGeo) richnessScore += 3;
      else richnessChecks.push('coordenadas geográficas');
      break;
    }
    default:
      // page, blog, transfer — no specific richness checks, give full score
      richnessScore = 7;
  }

  if (richnessChecks.length > 0) {
    recommendations.push(`Completa información de contenido: ${richnessChecks.join(', ')}.`);
  }
  checks.push({
    id: 'content_richness', dimension: 'content', maxPoints: 7,
    pass: richnessScore >= 5, score: richnessScore,
    message: richnessScore >= 7
      ? 'Contenido rico y completo'
      : `Falta: ${richnessChecks.join(', ')}`,
  });

  // #14: Keyword density 0.5-2.5% — 2pts
  let densityScore = 0;
  if (!keyword || wc === 0) {
    densityScore = 1; // neutral
  } else if (input.description) {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const occurrences = (input.description.toLowerCase().match(regex) || []).length;
    const density = (occurrences / wc) * 100;
    if (density >= 0.5 && density <= 2.5) densityScore = 2;
    else if (density > 0 && density < 0.5) densityScore = 1;
    else if (density > 2.5) densityScore = 1;
    if (density > 2.5) recommendations.push('Reduce la densidad de keyword (>2.5%) — evita keyword stuffing.');
    if (density < 0.5 && density > 0) recommendations.push('Aumenta ligeramente la presencia de la keyword (ideal: 0.5-2.5%).');
  }
  checks.push({
    id: 'keyword_density', dimension: 'content', maxPoints: 2,
    pass: densityScore === 2, score: densityScore,
    message: !keyword ? 'Sin keyword definida' : `Densidad de keyword evaluada`,
  });

  // #15: Alt texts (images with meaningful names) — 5pts
  // Without DOM access, we check if images array has non-empty meaningful URLs
  const imgs = input.images ?? (input.image ? [input.image] : []);
  let altScore = 5; // default full if no images
  if (imgs.length > 0) {
    // Heuristic: URLs without descriptive paths score lower
    const descriptive = imgs.filter(
      (url) => !url.match(/^https?:\/\/[^/]+\/?$/) && url.length > 10
    );
    altScore = descriptive.length === imgs.length ? 5 : Math.round((descriptive.length / imgs.length) * 5);
  }
  checks.push({
    id: 'image_alt_texts', dimension: 'content', maxPoints: 5,
    pass: altScore >= 4, score: altScore,
    message: imgs.length > 0
      ? `${imgs.length} imágenes con URLs descriptivas`
      : 'Sin imágenes para evaluar alt texts',
  });

  // ═══ TECHNICAL DIMENSION (25% → 25 points max) ═══

  // #16: JSON-LD present — 7pts
  const jsonLdScore = input.hasJsonLd ? 7 : 0;
  if (!input.hasJsonLd) recommendations.push('Agrega datos estructurados JSON-LD (Schema.org).');
  checks.push({
    id: 'json_ld', dimension: 'technical', maxPoints: 7,
    pass: input.hasJsonLd, score: jsonLdScore,
    message: input.hasJsonLd ? 'JSON-LD presente' : 'Faltan datos estructurados JSON-LD',
  });

  // #17: BreadcrumbList (inferred from slug depth) — 3pts
  const depth = slugDepth(input.slug);
  const hasBreadcrumb = depth >= 2 && input.hasJsonLd; // breadcrumb makes sense for nested pages
  const breadcrumbScore = depth < 2 ? 3 : hasBreadcrumb ? 3 : 0;
  if (depth >= 2 && !hasBreadcrumb) recommendations.push('Agrega BreadcrumbList en JSON-LD para rutas anidadas.');
  checks.push({
    id: 'breadcrumb_list', dimension: 'technical', maxPoints: 3,
    pass: breadcrumbScore === 3, score: breadcrumbScore,
    message: depth < 2
      ? 'Ruta raíz — BreadcrumbList no requerido'
      : hasBreadcrumb ? 'BreadcrumbList inferido (JSON-LD + profundidad)' : 'Falta BreadcrumbList para ruta anidada',
  });

  // #18: Hreflang — 4pts
  const hreflangScore = input.hasHreflang ? 4 : 0;
  if (!input.hasHreflang) recommendations.push('Agrega hreflang para señalizar idioma/región.');
  checks.push({
    id: 'hreflang', dimension: 'technical', maxPoints: 4,
    pass: input.hasHreflang, score: hreflangScore,
    message: input.hasHreflang ? 'Hreflang presente' : 'Falta hreflang',
  });

  // #19: Geo coordinates for destinations — 3pts
  const needsGeo = input.type === 'destination';
  const hasGeo = input.latitude != null && input.longitude != null;
  const geoScore = !needsGeo ? 3 : hasGeo ? 3 : 0;
  if (needsGeo && !hasGeo) recommendations.push('Agrega coordenadas geográficas (latitud/longitud) para el destino.');
  checks.push({
    id: 'geo_coordinates', dimension: 'technical', maxPoints: 3,
    pass: !needsGeo || hasGeo, score: geoScore,
    message: !needsGeo
      ? 'Coordenadas no requeridas para este tipo'
      : hasGeo ? 'Coordenadas presentes' : 'Faltan coordenadas geográficas',
  });

  // #20: AggregateRating for dest/hotel — 3pts
  const needsRating = ['destination', 'hotel'].includes(input.type);
  const hasRating = input.enrichmentRating != null || input.starRating != null;
  const ratingScore = !needsRating ? 3 : hasRating ? 3 : 0;
  if (needsRating && !hasRating) recommendations.push('Agrega valoración/rating para mejorar rich snippets.');
  checks.push({
    id: 'aggregate_rating', dimension: 'technical', maxPoints: 3,
    pass: !needsRating || hasRating, score: ratingScore,
    message: !needsRating
      ? 'Rating no requerido para este tipo'
      : hasRating ? 'Rating presente' : 'Falta rating/valoración',
  });

  // #21: Slug length 2-5 words — 2pts
  const swc = slugWordCount(input.slug);
  const slugLenScore = swc >= 2 && swc <= 5 ? 2 : swc === 1 ? 1 : 0;
  if (swc < 2) recommendations.push('Amplía el slug a al menos 2 palabras para mejor SEO.');
  if (swc > 5) recommendations.push('Reduce el slug a máximo 5 palabras — URLs más cortas rankean mejor.');
  checks.push({
    id: 'slug_length', dimension: 'technical', maxPoints: 2,
    pass: swc >= 2 && swc <= 5, score: slugLenScore,
    message: `Slug con ${swc} palabras (ideal: 2-5)`,
  });

  // #22: Keyword in URL — 2pts
  const kwInSlug = keyword ? input.slug.toLowerCase().includes(keyword.replace(/\s+/g, '-')) : false;
  const kwSlugScore = !keyword ? 1 : kwInSlug ? 2 : 0;
  if (keyword && !kwInSlug) recommendations.push('Incluye la keyword principal en la URL/slug.');
  checks.push({
    id: 'keyword_in_url', dimension: 'technical', maxPoints: 2,
    pass: kwInSlug || !keyword, score: kwSlugScore,
    message: !keyword ? 'Sin keyword definida' : kwInSlug ? 'Keyword presente en URL' : 'Keyword ausente de la URL',
  });

  // #23: URL depth ≤3 — 1pt (bonus check, fits within 25pts total technical)
  const urlDepthScore = depth <= 3 ? 1 : 0;
  if (depth > 3) recommendations.push('Reduce la profundidad de URL a máximo 3 niveles.');
  checks.push({
    id: 'url_depth', dimension: 'technical', maxPoints: 1,
    pass: depth <= 3, score: urlDepthScore,
    message: `Profundidad de URL: ${depth} niveles (máx: 3)`,
  });

  // ═══ CALCULATE DIMENSION SCORES ═══

  const metaChecks = checks.filter((c) => c.dimension === 'meta');
  const contentChecks = checks.filter((c) => c.dimension === 'content');
  const technicalChecks = checks.filter((c) => c.dimension === 'technical');

  const dimPercent = (arr: SeoCheck[]) => {
    const max = arr.reduce((sum, c) => sum + c.maxPoints, 0);
    const earned = arr.reduce((sum, c) => sum + c.score, 0);
    return max > 0 ? Math.round((earned / max) * 100) : 0;
  };

  const metaPercent = dimPercent(metaChecks);
  const contentPercent = dimPercent(contentChecks);
  const technicalPercent = dimPercent(technicalChecks);

  // Overall weighted: Meta 40%, Content 35%, Technical 25%
  const overall = Math.round(
    metaPercent * 0.4 + contentPercent * 0.35 + technicalPercent * 0.25
  );

  return {
    overall,
    grade: gradeFromScore(overall),
    dimensions: {
      meta: metaPercent,
      content: contentPercent,
      technical: technicalPercent,
    },
    checks,
    recommendations,
  };
}

// ─── Duplicate Detection ────────────────────────────────────────────────────

/**
 * Detects items with >80% similar SEO titles or descriptions.
 * Uses Jaccard similarity on word bigrams.
 *
 * @returns Map of "duplicate group key" → array of item IDs sharing that duplicate
 */
export function detectDuplicates(
  items: Array<{ id: string; type: string; seoTitle?: string; seoDescription?: string }>
): Map<string, string[]> {
  const duplicates = new Map<string, string[]>();

  // Compare titles
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];

      // Title similarity
      if (a.seoTitle && b.seoTitle) {
        const sim = jaccardBigram(a.seoTitle, b.seoTitle);
        if (sim > 0.8) {
          const key = `title:${a.seoTitle.substring(0, 30)}`;
          const group = duplicates.get(key) ?? [];
          if (!group.includes(a.id)) group.push(a.id);
          if (!group.includes(b.id)) group.push(b.id);
          duplicates.set(key, group);
        }
      }

      // Description similarity
      if (a.seoDescription && b.seoDescription) {
        const sim = jaccardBigram(a.seoDescription, b.seoDescription);
        if (sim > 0.8) {
          const key = `desc:${a.seoDescription.substring(0, 30)}`;
          const group = duplicates.get(key) ?? [];
          if (!group.includes(a.id)) group.push(a.id);
          if (!group.includes(b.id)) group.push(b.id);
          duplicates.set(key, group);
        }
      }
    }
  }

  return duplicates;
}

/**
 * Jaccard similarity on character bigrams.
 * Returns 0-1 where 1 means identical.
 */
function jaccardBigram(a: string, b: string): number {
  const bigramsA = toBigrams(a.toLowerCase());
  const bigramsB = toBigrams(b.toLowerCase());

  if (bigramsA.size === 0 && bigramsB.size === 0) return 1;
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;

  let intersection = 0;
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) intersection++;
  }

  const union = bigramsA.size + bigramsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function toBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  const normalized = str.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < normalized.length - 1; i++) {
    bigrams.add(normalized.substring(i, i + 2));
  }
  return bigrams;
}
