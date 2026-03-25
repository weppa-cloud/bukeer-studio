/**
 * Content Scoring Engine — 21 checks, 4 dimensions, A-F grading
 *
 * Pure algorithmic scoring, no LLM calls. Cost: $0/call.
 * Based on research from SPEC_BLOG_GENERATOR_SEO_PIPELINE.md §5.1.2
 *
 * Dimensions: SEO (35%), Structure (38%), Readability (9%), GEO (15%)
 */

import { parseContent, type ContentStructure } from './content-parser';

export interface ScoreCheck {
  id: string;
  category: 'seo' | 'readability' | 'structure' | 'geo';
  pass: boolean;
  score: number; // 0-100
  weight: number;
  message: string;
}

export interface ScoringResult {
  overall: number;     // 0-100
  seo: number;         // 0-100
  readability: number; // 0-100
  structure: number;   // 0-100
  geo: number;         // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: ScoreCheck[];
  contentStructure: ContentStructure;
}

interface ScoringInput {
  content: string;
  title: string;
  metaDescription?: string;
  keywords?: string[];
  faqItems?: { question: string; answer: string }[];
  locale?: string;
  featuredImage?: string;
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

/** Run all 21 checks and return scored result */
export function scoreContent(input: ScoringInput): ScoringResult {
  const { content, title, metaDescription, keywords, faqItems, locale, featuredImage } = input;
  const structure = parseContent(content);
  const checks: ScoreCheck[] = [];

  // === SEO CHECKS (6 checks, total weight: 35) ===

  // #1: Word count (target: 2,100-2,400)
  const wc = structure.totalWords;
  const wcScore = wc >= 2100 && wc <= 2400 ? 100
    : wc >= 1800 && wc <= 3000 ? 70
    : wc >= 1000 ? 40 : 10;
  checks.push({
    id: 'word_count', category: 'seo', weight: 10,
    pass: wc >= 1800 && wc <= 3000, score: wcScore,
    message: `${wc} words (target: 2,100-2,400)`,
  });

  // #2: Title length (≤70 chars)
  const titleLen = title.length;
  checks.push({
    id: 'title_length', category: 'seo', weight: 5,
    pass: titleLen <= 70, score: titleLen <= 70 ? 100 : titleLen <= 80 ? 60 : 20,
    message: `${titleLen} chars (max: 70)`,
  });

  // #3: Meta description (140-160 chars)
  const metaLen = metaDescription?.length || 0;
  const metaScore = metaLen >= 140 && metaLen <= 160 ? 100
    : metaLen >= 120 && metaLen <= 165 ? 70
    : metaLen > 0 ? 40 : 0;
  checks.push({
    id: 'meta_description', category: 'seo', weight: 8,
    pass: metaLen >= 120 && metaLen <= 165, score: metaScore,
    message: metaLen > 0 ? `${metaLen} chars (ideal: 140-160)` : 'Missing meta description',
  });

  // #4: Keyword in title
  const primaryKeyword = keywords?.[0]?.toLowerCase() || '';
  const kwInTitle = primaryKeyword ? title.toLowerCase().includes(primaryKeyword) : false;
  checks.push({
    id: 'keyword_in_title', category: 'seo', weight: 5,
    pass: kwInTitle || !primaryKeyword, score: kwInTitle ? 100 : primaryKeyword ? 0 : 50,
    message: kwInTitle ? 'Primary keyword found in title' : primaryKeyword ? 'Primary keyword missing from title' : 'No keywords provided',
  });

  // #5: Keyword in H2
  const kwInH2 = primaryKeyword
    ? structure.sections.some(s => s.level === 2 && s.heading.toLowerCase().includes(primaryKeyword))
    : false;
  checks.push({
    id: 'keyword_in_h2', category: 'seo', weight: 3,
    pass: kwInH2 || !primaryKeyword, score: kwInH2 ? 100 : primaryKeyword ? 0 : 50,
    message: kwInH2 ? 'Keyword found in H2 heading' : primaryKeyword ? 'Keyword missing from H2 headings' : 'No keywords provided',
  });

  // #6: Keyword density (0.5-2.5%)
  let densityScore = 50;
  let densityMsg = 'No keywords provided';
  if (primaryKeyword && wc > 0) {
    const regex = new RegExp(primaryKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const occurrences = (content.toLowerCase().match(regex) || []).length;
    const density = (occurrences / wc) * 100;
    densityScore = density >= 0.5 && density <= 2.5 ? 100
      : density >= 0.3 && density <= 3.0 ? 60 : 20;
    densityMsg = `${density.toFixed(1)}% (ideal: 0.5-2.5%)`;
  }
  checks.push({
    id: 'keyword_density', category: 'seo', weight: 4,
    pass: densityScore >= 60, score: densityScore,
    message: densityMsg,
  });

  // === STRUCTURE CHECKS (6 checks, total weight: 38) ===

  // #7: Answer-first (≤60 words after H2)
  const h2Sections = structure.sections.filter(s => s.level === 2);
  const answerFirstPct = h2Sections.length > 0
    ? (h2Sections.filter(s => s.hasAnswerFirst).length / h2Sections.length) * 100
    : 0;
  checks.push({
    id: 'answer_first', category: 'structure', weight: 12,
    pass: answerFirstPct >= 75, score: clamp(answerFirstPct, 0, 100),
    message: `${Math.round(answerFirstPct)}% of H2 sections have answer-first (target: ≥75%)`,
  });

  // #8: Section length (134-167 words per H2)
  const avgSectionWords = h2Sections.length > 0
    ? h2Sections.reduce((sum, s) => sum + s.wordCount, 0) / h2Sections.length
    : 0;
  const sectionLenScore = avgSectionWords >= 134 && avgSectionWords <= 167 ? 100
    : avgSectionWords >= 100 && avgSectionWords <= 250 ? 60 : 30;
  checks.push({
    id: 'section_length', category: 'structure', weight: 8,
    pass: sectionLenScore >= 60, score: sectionLenScore,
    message: `Avg ${Math.round(avgSectionWords)} words/section (ideal: 134-167)`,
  });

  // #9: Paragraph length (40-60 words avg)
  const paraScore = structure.avgParagraphWords <= 60 ? 100
    : structure.avgParagraphWords <= 70 ? 70 : 30;
  checks.push({
    id: 'paragraph_length', category: 'structure', weight: 5,
    pass: structure.avgParagraphWords <= 70, score: paraScore,
    message: `Avg ${structure.avgParagraphWords} words/paragraph (ideal: 40-60)`,
  });

  // #10: Heading hierarchy (H2→H3, no skips)
  let hierarchyOk = true;
  for (let i = 1; i < structure.sections.length; i++) {
    const prev = structure.sections[i - 1].level;
    const curr = structure.sections[i].level;
    if (curr > prev + 1) { hierarchyOk = false; break; }
  }
  checks.push({
    id: 'heading_hierarchy', category: 'structure', weight: 3,
    pass: hierarchyOk, score: hierarchyOk ? 100 : 30,
    message: hierarchyOk ? 'Proper H2→H3 nesting' : 'Heading level skipped (e.g., H2→H4)',
  });

  // #11: Has TL;DR
  checks.push({
    id: 'has_tldr', category: 'structure', weight: 5,
    pass: structure.hasTLDR, score: structure.hasTLDR ? 100 : 0,
    message: structure.hasTLDR ? 'TL;DR section found' : 'No TL;DR section at start',
  });

  // #12: Has FAQ (3+ items)
  const hasFaqContent = (faqItems && faqItems.length >= 3) || structure.hasFAQ;
  checks.push({
    id: 'has_faq', category: 'structure', weight: 5,
    pass: !!hasFaqContent, score: hasFaqContent ? 100 : 0,
    message: hasFaqContent
      ? `FAQ section with ${faqItems?.length || '3+'} items`
      : 'No FAQ section (need 3+ items for FAQPage schema)',
  });

  // === READABILITY CHECKS (3 checks, total weight: 9) ===

  // #13: Data density (≥1 stat per H2)
  const avgDataPoints = h2Sections.length > 0
    ? h2Sections.reduce((sum, s) => sum + s.dataPoints, 0) / h2Sections.length
    : 0;
  checks.push({
    id: 'data_density', category: 'readability', weight: 5,
    pass: avgDataPoints >= 0.5, score: clamp(avgDataPoints * 100, 0, 100),
    message: `${avgDataPoints.toFixed(1)} data points/section (target: ≥1)`,
  });

  // #14: Sentence variety
  const sentences = content.replace(/[#*_`]/g, '').split(/[.!?]+/).filter(s => s.trim().length > 5);
  const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avgSentLen = sentenceLengths.length > 0
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length : 0;
  const sentStdDev = sentenceLengths.length > 1
    ? Math.sqrt(sentenceLengths.reduce((sum, l) => sum + Math.pow(l - avgSentLen, 2), 0) / sentenceLengths.length)
    : 0;
  const varietyScore = sentStdDev > 5 ? 100 : sentStdDev > 3 ? 60 : 30;
  checks.push({
    id: 'sentence_variety', category: 'readability', weight: 2,
    pass: varietyScore >= 60, score: varietyScore,
    message: `Sentence length std dev: ${sentStdDev.toFixed(1)} (higher = more variety)`,
  });

  // #15: Passive voice (<15%)
  // Simple heuristic for Spanish/English passive patterns
  const passivePatterns = locale === 'es'
    ? /\b(fue|fueron|es|son|será|serán|sido|siendo)\s+\w+[ado|ido|to|so|cho]/gi
    : /\b(was|were|is|are|been|being)\s+\w+(ed|en|t)\b/gi;
  const passiveMatches = content.match(passivePatterns) || [];
  const passivePct = sentences.length > 0 ? (passiveMatches.length / sentences.length) * 100 : 0;
  checks.push({
    id: 'passive_voice', category: 'readability', weight: 2,
    pass: passivePct < 20, score: passivePct < 15 ? 100 : passivePct < 20 ? 70 : 30,
    message: `~${Math.round(passivePct)}% passive voice (target: <15%)`,
  });

  // === GEO CHECKS (6 checks, total weight: 17) ===

  // #16: Internal links (2-5 per 1,000 words)
  const internalPerK = wc > 0 ? (structure.internalLinkCount / wc) * 1000 : 0;
  checks.push({
    id: 'internal_links', category: 'geo', weight: 5,
    pass: internalPerK >= 1, score: internalPerK >= 2 ? 100 : internalPerK >= 1 ? 70 : internalPerK > 0 ? 40 : 0,
    message: `${structure.internalLinkCount} internal links (${internalPerK.toFixed(1)}/1K words, target: 2-5)`,
  });

  // #17: External links (≥2 authoritative)
  checks.push({
    id: 'external_links', category: 'geo', weight: 3,
    pass: structure.externalLinkCount >= 1, score: structure.externalLinkCount >= 2 ? 100 : structure.externalLinkCount === 1 ? 60 : 0,
    message: `${structure.externalLinkCount} external links (target: ≥2)`,
  });

  // #18: Image alt text
  const imgMatches = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
  const imgsWithAlt = imgMatches.filter(m => {
    const alt = m.match(/!\[([^\]]*)\]/)?.[1] || '';
    return alt.trim().length > 0;
  });
  const altPct = imgMatches.length > 0 ? (imgsWithAlt.length / imgMatches.length) * 100 : 100;
  checks.push({
    id: 'image_alt_text', category: 'geo', weight: 2,
    pass: altPct === 100, score: altPct,
    message: imgMatches.length > 0
      ? `${imgsWithAlt.length}/${imgMatches.length} images have alt text`
      : 'No images in content',
  });

  // #19: Schema ready (FAQ items parseable)
  const schemaReady = faqItems ? faqItems.every(f => f.question && f.answer) : structure.hasFAQ;
  checks.push({
    id: 'schema_ready', category: 'geo', weight: 3,
    pass: !!schemaReady, score: schemaReady ? 100 : 0,
    message: schemaReady ? 'FAQ items valid for FAQPage schema' : 'No valid FAQ items for schema generation',
  });

  // #20: OG ready (title + description + image)
  const ogReady = title && metaDescription && featuredImage;
  checks.push({
    id: 'og_ready', category: 'geo', weight: 2,
    pass: !!ogReady, score: ogReady ? 100 : (title && metaDescription ? 60 : 20),
    message: ogReady ? 'Title, description, and image ready for OG tags' : `Missing: ${[!title && 'title', !metaDescription && 'description', !featuredImage && 'image'].filter(Boolean).join(', ')}`,
  });

  // #21: Hreflang ready
  const hreflangReady = !!locale && locale.length === 2;
  checks.push({
    id: 'hreflang_ready', category: 'geo', weight: 2,
    pass: hreflangReady, score: hreflangReady ? 100 : 0,
    message: hreflangReady ? `Locale set: ${locale}` : 'No locale configured for hreflang',
  });

  // === CALCULATE DIMENSION SCORES ===
  const dimensions: Record<string, number[]> = { seo: [], readability: [], structure: [], geo: [] };
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const check of checks) {
    dimensions[check.category].push(check.score);
    totalWeightedScore += check.score * check.weight;
    totalWeight += check.weight;
  }

  const dimAvg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const overall = Math.round(totalWeightedScore / totalWeight);

  return {
    overall,
    seo: dimAvg(dimensions.seo),
    readability: dimAvg(dimensions.readability),
    structure: dimAvg(dimensions.structure),
    geo: dimAvg(dimensions.geo),
    grade: gradeFromScore(overall),
    checks,
    contentStructure: structure,
  };
}
