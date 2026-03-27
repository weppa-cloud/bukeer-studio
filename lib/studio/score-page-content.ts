/**
 * Page Content Scoring — Adapted from blog content-scorer.ts
 *
 * Page-specific thresholds:
 * - Word count: 300-1,500 (vs blog's 2,100-2,400)
 * - FAQ not required
 * - Internal links min: 0
 * - Focus on section variety and CTA presence
 *
 * Dimensions: SEO (40%), Structure (35%), Content Quality (25%)
 */

export interface PageScoreCheck {
  id: string;
  category: 'seo' | 'structure' | 'quality';
  pass: boolean;
  score: number; // 0-100
  weight: number;
  message: string;
}

export interface PageScoringResult {
  overall: number;
  seo: number;
  structure: number;
  quality: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: PageScoreCheck[];
}

interface PageScoringInput {
  sections: Array<{
    sectionType: string;
    isEnabled: boolean;
    content: Record<string, unknown>;
  }>;
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  pageTitle?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function extractTextFromContent(content: Record<string, unknown>): string {
  const texts: string[] = [];
  for (const value of Object.values(content)) {
    if (typeof value === 'string') {
      texts.push(value);
    }
  }
  return texts.join(' ');
}

export function scorePageContent(input: PageScoringInput): PageScoringResult {
  const { sections, seoTitle, seoDescription, keywords, pageTitle } = input;
  const checks: PageScoreCheck[] = [];

  const enabledSections = sections.filter((s) => s.isEnabled);
  const allText = enabledSections.map((s) => extractTextFromContent(s.content)).join(' ');
  const wordCount = allText.split(/\s+/).filter(Boolean).length;
  const sectionTypes = new Set(enabledSections.map((s) => s.sectionType));

  // === SEO CHECKS (weight: 40) ===

  // #1: Page has SEO title (weight: 8)
  const hasSeoTitle = !!seoTitle && seoTitle.length > 0;
  const titleLen = seoTitle?.length ?? 0;
  const titleScore = !hasSeoTitle ? 0 : titleLen <= 70 ? 100 : titleLen <= 80 ? 60 : 30;
  checks.push({
    id: 'seo_title', category: 'seo', weight: 8,
    pass: hasSeoTitle && titleLen <= 70,
    score: titleScore,
    message: hasSeoTitle ? `SEO title: ${titleLen} chars (max 70)` : 'Missing SEO title',
  });

  // #2: Meta description (weight: 8)
  const hasMetaDesc = !!seoDescription && seoDescription.length > 0;
  const descLen = seoDescription?.length ?? 0;
  const descScore = !hasMetaDesc ? 0 : descLen >= 120 && descLen <= 160 ? 100 : descLen >= 80 ? 60 : 30;
  checks.push({
    id: 'meta_description', category: 'seo', weight: 8,
    pass: hasMetaDesc && descLen >= 120 && descLen <= 160,
    score: descScore,
    message: hasMetaDesc ? `Meta description: ${descLen} chars (target: 120-160)` : 'Missing meta description',
  });

  // #3: Keywords defined (weight: 6)
  const kwCount = keywords?.length ?? 0;
  const kwScore = kwCount >= 3 ? 100 : kwCount >= 1 ? 60 : 0;
  checks.push({
    id: 'keywords', category: 'seo', weight: 6,
    pass: kwCount >= 3,
    score: kwScore,
    message: kwCount > 0 ? `${kwCount} keywords (target: 3+)` : 'No keywords defined',
  });

  // #4: Keyword in content (weight: 6)
  const textLower = allText.toLowerCase();
  const kwInContent = keywords?.filter((kw) => textLower.includes(kw.toLowerCase())).length ?? 0;
  const kwContentScore = kwCount === 0 ? 0 : clamp((kwInContent / kwCount) * 100, 0, 100);
  checks.push({
    id: 'keyword_usage', category: 'seo', weight: 6,
    pass: kwInContent >= Math.ceil(kwCount * 0.5),
    score: kwContentScore,
    message: kwCount > 0 ? `${kwInContent}/${kwCount} keywords found in content` : 'No keywords to check',
  });

  // #5: Word count (weight: 6)
  const wcScore = wordCount >= 300 && wordCount <= 1500 ? 100
    : wordCount >= 200 ? 70
    : wordCount >= 100 ? 40 : 10;
  checks.push({
    id: 'word_count', category: 'seo', weight: 6,
    pass: wordCount >= 300,
    score: wcScore,
    message: `${wordCount} words (target: 300-1,500)`,
  });

  // #6: Page title exists (weight: 6)
  const hasTitleScore = pageTitle && pageTitle.length > 2 ? 100 : 0;
  checks.push({
    id: 'page_title', category: 'seo', weight: 6,
    pass: !!pageTitle && pageTitle.length > 2,
    score: hasTitleScore,
    message: pageTitle ? `Page title: "${pageTitle}"` : 'Missing page title',
  });

  // === STRUCTURE CHECKS (weight: 35) ===

  // #7: Has hero section (weight: 8)
  const hasHero = sectionTypes.has('hero') || sectionTypes.has('hero_image') || sectionTypes.has('hero_video') || sectionTypes.has('hero_minimal');
  checks.push({
    id: 'has_hero', category: 'structure', weight: 8,
    pass: hasHero, score: hasHero ? 100 : 0,
    message: hasHero ? 'Has hero section' : 'Missing hero section',
  });

  // #8: Has CTA (weight: 7)
  const hasCta = sectionTypes.has('cta') || sectionTypes.has('cta_banner') || sectionTypes.has('contact_form') || sectionTypes.has('newsletter');
  checks.push({
    id: 'has_cta', category: 'structure', weight: 7,
    pass: hasCta, score: hasCta ? 100 : 0,
    message: hasCta ? 'Has call-to-action section' : 'Missing CTA section — add one to drive conversions',
  });

  // #9: Section count (weight: 7)
  const sectionCount = enabledSections.length;
  const scScore = sectionCount >= 4 && sectionCount <= 12 ? 100
    : sectionCount >= 2 ? 60
    : sectionCount >= 1 ? 30 : 0;
  checks.push({
    id: 'section_count', category: 'structure', weight: 7,
    pass: sectionCount >= 4,
    score: scScore,
    message: `${sectionCount} sections (target: 4-12)`,
  });

  // #10: Section variety (weight: 7)
  const varietyScore = sectionTypes.size >= 4 ? 100
    : sectionTypes.size >= 3 ? 70
    : sectionTypes.size >= 2 ? 40 : 10;
  checks.push({
    id: 'section_variety', category: 'structure', weight: 7,
    pass: sectionTypes.size >= 4,
    score: varietyScore,
    message: `${sectionTypes.size} unique section types (target: 4+)`,
  });

  // #11: No disabled sections (weight: 6)
  const disabledCount = sections.length - enabledSections.length;
  checks.push({
    id: 'no_disabled', category: 'structure', weight: 6,
    pass: disabledCount === 0,
    score: disabledCount === 0 ? 100 : 50,
    message: disabledCount > 0 ? `${disabledCount} hidden sections — consider removing or enabling them` : 'All sections visible',
  });

  // === QUALITY CHECKS (weight: 25) ===

  // #12: Has social proof (weight: 7)
  const hasSocialProof = sectionTypes.has('testimonials') || sectionTypes.has('testimonials_carousel') || sectionTypes.has('partners') || sectionTypes.has('logo_cloud') || sectionTypes.has('stats');
  checks.push({
    id: 'social_proof', category: 'quality', weight: 7,
    pass: hasSocialProof, score: hasSocialProof ? 100 : 0,
    message: hasSocialProof ? 'Has social proof section' : 'Consider adding testimonials or partner logos for trust',
  });

  // #13: Has product sections (weight: 6)
  const hasProducts = sectionTypes.has('hotels') || sectionTypes.has('activities') || sectionTypes.has('destinations');
  checks.push({
    id: 'has_products', category: 'quality', weight: 6,
    pass: hasProducts, score: hasProducts ? 100 : 30,
    message: hasProducts ? 'Showcases travel products' : 'Consider adding destinations, hotels, or activities sections',
  });

  // #14: Content completeness (weight: 6)
  const emptySections = enabledSections.filter((s) => {
    const text = extractTextFromContent(s.content);
    return text.trim().length < 10;
  });
  const completenessScore = enabledSections.length > 0
    ? clamp(((enabledSections.length - emptySections.length) / enabledSections.length) * 100, 0, 100)
    : 0;
  checks.push({
    id: 'content_complete', category: 'quality', weight: 6,
    pass: emptySections.length === 0,
    score: completenessScore,
    message: emptySections.length > 0
      ? `${emptySections.length} sections have minimal content — add more text`
      : 'All sections have content',
  });

  // #15: Has about/features content (weight: 6)
  const hasAboutContent = sectionTypes.has('about') || sectionTypes.has('features') || sectionTypes.has('features_grid') || sectionTypes.has('text_image');
  checks.push({
    id: 'has_about', category: 'quality', weight: 6,
    pass: hasAboutContent, score: hasAboutContent ? 100 : 20,
    message: hasAboutContent ? 'Has about/features content' : 'Consider adding an About or Features section',
  });

  // === Calculate dimension scores ===
  const calcDimension = (category: 'seo' | 'structure' | 'quality') => {
    const categoryChecks = checks.filter((c) => c.category === category);
    const totalWeight = categoryChecks.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight === 0) return 0;
    return Math.round(
      categoryChecks.reduce((sum, c) => sum + (c.score * c.weight) / totalWeight, 0)
    );
  };

  const seoScore = calcDimension('seo');
  const structureScore = calcDimension('structure');
  const qualityScore = calcDimension('quality');

  // Overall: SEO 40%, Structure 35%, Quality 25%
  const overall = Math.round(seoScore * 0.4 + structureScore * 0.35 + qualityScore * 0.25);

  return {
    overall,
    seo: seoScore,
    structure: structureScore,
    quality: qualityScore,
    grade: gradeFromScore(overall),
    checks,
  };
}
