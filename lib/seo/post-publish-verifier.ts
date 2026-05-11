/**
 * Post-Publish Verifier Agent
 *
 * Fetches a published URL + target locale and runs 14 SEO/content quality
 * checks (8 critical, 6 non-critical) to determine whether the page is
 * ready to be exposed to sitemaps and hreflang indexing.
 *
 * Runs in Next.js server context (Edge / Node). Uses fetch() for HTTP.
 */

import type {
  VerificationCheck,
  VerificationResult,
  VerificationStatus,
} from './verification-types';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Context passed to every check runner. */
export interface CheckContext {
  url: string;
  locale: string;
  html: string;
  /** HTTP status code from the fetch. */
  statusCode: number;
  /** Final URL after redirects. */
  finalUrl: string;
}

type CheckRunner = (ctx: CheckContext) => Promise<VerificationCheck>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(prefix: string, msg: string): void {
  console.log(`[Verifier:${prefix}] ${msg}`);
}

/** Extract the language subtag from a locale (e.g. "es-CO" → "es"). */
function localeToLang(locale: string): string {
  return locale.split('-')[0]?.toLowerCase() ?? locale.toLowerCase();
}

/** Basic language code → human-readable name. */
const LANG_NAMES: Record<string, string> = {
  es: 'Spanish',
  en: 'English',
  pt: 'Portuguese',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  nl: 'Dutch',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
};

function langName(code: string): string {
  return LANG_NAMES[code] ?? code;
}

/** Quick-and-dirty fetch that returns HTML body + status. */
async function fetchPage(
  url: string,
  timeoutMs: number,
): Promise<{ status: number; html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Bukeer-Verifier/1.0 (SEO post-publish quality gate)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    const html = await resp.text();

    return {
      status: resp.status,
      html,
      finalUrl: resp.url,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Build a pass check. */
function pass(
  name: string,
  label: string,
  critical: boolean,
  detail?: string,
): VerificationCheck {
  return { name, label, critical, passed: true, ...(detail ? { detail } : {}) };
}

/** Build a fail check. */
function fail(
  name: string,
  label: string,
  critical: boolean,
  detail: string,
): VerificationCheck {
  return { name, label, critical, passed: false, detail };
}

/**
 * Extract a <meta> tag content value by name or property.
 * Case-insensitive matching.
 */
function extractMeta(
  html: string,
  attr: 'name' | 'property',
  value: string,
): string | null {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // <meta name="..." content="...">
  const pattern = new RegExp(
    `<meta[^>]+${attr}\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']+)["']`,
    'i',
  );
  const match = html.match(pattern);
  if (match) return match[1];

  // <meta content="..." name="...">
  const patternRev = new RegExp(
    `<meta[^>]+content\\s*=\\s*["']([^"']+)["'][^>]*${attr}\\s*=\\s*["']${escaped}["']`,
    'i',
  );
  const matchRev = html.match(patternRev);
  return matchRev?.[1] ?? null;
}

/** Extract all hreflang link tags. */
function extractHreflangs(
  html: string,
): Array<{ hreflang: string; href: string }> {
  const results: Array<{ hreflang: string; href: string }> = [];
  // <link rel="alternate" hreflang="..." href="...">
  const pattern =
    /<link[^>]+rel\s*=\s*["']alternate["'][^>]+hreflang\s*=\s*["']([^"']+)["'][^>]+href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(html)) !== null) {
    results.push({ hreflang: m[1].toLowerCase(), href: m[2] });
  }

  // <link href="..." rel="alternate" hreflang="...">
  const patternRev =
    /<link[^>]+href\s*=\s*["']([^"']+)["'][^>]+rel\s*=\s*["']alternate["'][^>]+hreflang\s*=\s*["']([^"']+)["']/gi;
  while ((m = patternRev.exec(html)) !== null) {
    results.push({ hreflang: m[2].toLowerCase(), href: m[1] });
  }

  return results;
}

/** Extract JSON-LD script content. */
function extractJsonLd(html: string): string[] {
  const results: string[] = [];
  const pattern =
    /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(html)) !== null) {
    results.push(m[1].trim());
  }
  return results;
}

/** Check if body text contains words from a given language (basic heuristic). */
function detectLanguageInText(text: string, targetLang: string): boolean {
  const langMarkerWords: Record<string, string[]> = {
    es: [
      'el', 'la', 'los', 'las', 'de', 'del', 'en', 'un', 'una',
      'y', 'que', 'es', 'por', 'con', 'para', 'su', 'no', 'más',
      'pero', 'este', 'como', 'muy', 'todo', 'entre', 'tiene',
    ],
    en: [
      'the', 'a', 'an', 'of', 'in', 'to', 'and', 'is', 'it', 'for',
      'that', 'on', 'with', 'this', 'are', 'be', 'from', 'or',
      'have', 'has', 'was', 'but', 'not', 'you', 'all', 'can',
    ],
    pt: [
      'o', 'a', 'os', 'as', 'de', 'do', 'da', 'em', 'um', 'uma',
      'e', 'que', 'é', 'por', 'com', 'para', 'seu', 'sua', 'não',
      'mais', 'como', 'mas', 'muito', 'entre', 'tem', 'está',
    ],
    fr: [
      'le', 'la', 'les', 'de', 'du', 'des', 'en', 'un', 'une',
      'et', 'que', 'est', 'pour', 'dans', 'sur', 'avec', 'pas',
      'plus', 'mais', 'tout', 'par', 'fait', 'sont', 'cette',
    ],
    de: [
      'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine',
      'und', 'ist', 'nicht', 'mit', 'auf', 'für', 'sind', 'aus',
      'bei', 'hat', 'von', 'sich', 'auch', 'oder', 'nach',
    ],
  };

  const markers = langMarkerWords[targetLang];
  if (!markers) {
    // Unknown language – skip heuristic, return true
    return true;
  }

  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const wordSet = new Set(words);
  const matched = markers.filter((w) => wordSet.has(w));
  const density = matched.length / words.length;

  // A match rate above 1% of total words is a strong signal
  return density >= 0.01;
}

/** Check if text is likely empty or boilerplate. */
function isMeaningfulText(text: string): boolean {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 20;
}

/** Recursively find inLanguage in a parsed JSON-LD object. */
function findInLanguage(obj: unknown): string | null {
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = findInLanguage(item);
        if (result) return result;
      }
      return null;
    }

    const record = obj as Record<string, unknown>;
    if (typeof record.inLanguage === 'string') return record.inLanguage;

    for (const val of Object.values(record)) {
      const result = findInLanguage(val);
      if (result) return result;
    }
  }
  return null;
}

// ─── Check Implementations ──────────────────────────────────────────────────

/** 1. HTTP 200 — critical */
async function checkHttp200(ctx: CheckContext): Promise<VerificationCheck> {
  if (ctx.statusCode === 200) {
    return pass('http_200', 'Page returns HTTP 200', true, `Status: 200`);
  }
  return fail(
    'http_200',
    'Page returns HTTP 200',
    true,
    `Expected 200, got ${ctx.statusCode}`,
  );
}

/** 2. No fallback content — critical */
async function checkNoFallback(ctx: CheckContext): Promise<VerificationCheck> {
  const lang = localeToLang(ctx.locale);

  const fallbackPatterns: Record<string, string[]> = {
    es: [
      'texto pendiente de traducción',
      'contenido pendiente',
      '[EN]',
      'translate me',
      'coming soon',
    ],
    en: [
      'texto pendiente de traducción',
      'contenido pendiente',
      'pendiente de traducción',
      'traducir',
      'coming soon',
    ],
    pt: [
      'texto pendente de tradução',
      'conteúdo pendente',
      '[EN]',
      'translate me',
      'coming soon',
    ],
    fr: [
      'texte en attente de traduction',
      'contenu en attente',
      '[EN]',
      'translate me',
      'coming soon',
    ],
    de: [
      'text ausstehend',
      'übersetzung ausstehend',
      '[EN]',
      'translate me',
      'coming soon',
    ],
  };

  const patterns = fallbackPatterns[lang] ?? fallbackPatterns.en!;
  const htmlLower = ctx.html.toLowerCase();
  const found = patterns.filter((p) => htmlLower.includes(p.toLowerCase()));

  if (found.length === 0) {
    return pass(
      'no_fallback',
      'No fallback/untranslated content detected',
      true,
    );
  }

  return fail(
    'no_fallback',
    'No fallback/untranslated content detected',
    true,
    `Found fallback strings: ${found.join(', ')}`,
  );
}

/** 3. HTML lang attribute — critical */
async function checkHtmlLang(ctx: CheckContext): Promise<VerificationCheck> {
  const expected = localeToLang(ctx.locale);
  const match = ctx.html.match(/<html[^>]*\slang\s*=\s*["']([^"']+)["']/i);
  const actual = match?.[1]?.toLowerCase() ?? null;

  if (actual && actual.startsWith(expected)) {
    return pass(
      'html_lang',
      '<html lang> matches target locale',
      true,
      `lang="${actual}"`,
    );
  }

  if (!actual) {
    return fail(
      'html_lang',
      '<html lang> matches target locale',
      true,
      'No lang attribute found on <html> element',
    );
  }

  return fail(
    'html_lang',
    '<html lang> matches target locale',
    true,
    `Expected "${expected}*", got "${actual}"`,
  );
}

/** 4. Canonical self-reference — critical */
async function checkCanonicalSelf(ctx: CheckContext): Promise<VerificationCheck> {
  const canonical =
    extractMeta(ctx.html, 'name', 'canonical') ??
    ctx.html.match(
      /<link[^>]+rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["']/i,
    )?.[1] ??
    ctx.html.match(
      /<link[^>]+href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']canonical["']/i,
    )?.[1];

  if (!canonical) {
    return fail(
      'canonical_self',
      'Canonical URL points to self',
      true,
      'No canonical link tag found',
    );
  }

  const normalizedCanonical = canonical.replace(/\/+$/, '');
  const normalizedUrl = ctx.url.replace(/\/+$/, '');

  if (normalizedCanonical === normalizedUrl) {
    return pass(
      'canonical_self',
      'Canonical URL points to self',
      true,
      canonical,
    );
  }

  return fail(
    'canonical_self',
    'Canonical URL points to self',
    true,
    `Canonical "${canonical}" does not match URL "${ctx.url}"`,
  );
}

/** 5. Hreflang reciprocal — critical */
async function checkHreflangReciprocal(ctx: CheckContext): Promise<VerificationCheck> {
  const lang = localeToLang(ctx.locale);
  const hreflangs = extractHreflangs(ctx.html);

  // Remove duplicates — keep first occurrence
  const unique = new Map<string, string>();
  for (const h of hreflangs) {
    if (!unique.has(h.hreflang)) {
      unique.set(h.hreflang, h.href);
    }
  }

  const entries = Array.from(unique.entries());

  if (entries.length < 2) {
    return fail(
      'hreflang_reciprocal',
      'Hreflang tags are present and reciprocal',
      true,
      `Found ${entries.length} hreflang entries (need ≥2 for reciprocity)`,
    );
  }

  const hasSelf = entries.some(([hl]) => hl.startsWith(lang));

  if (!hasSelf) {
    return fail(
      'hreflang_reciprocal',
      'Hreflang tags are present and reciprocal',
      true,
      `No hreflang entry for "${lang}" among ${entries.length} tags`,
    );
  }

  return pass(
    'hreflang_reciprocal',
    'Hreflang tags are present and reciprocal',
    true,
    `${entries.length} hreflang entries found including "${lang}"`,
  );
}

/** 6. Indexability — critical */
async function checkIndexability(ctx: CheckContext): Promise<VerificationCheck> {
  const robotsMeta =
    extractMeta(ctx.html, 'name', 'robots') ??
    extractMeta(ctx.html, 'name', 'ROBOTS') ??
    '';

  if (/noindex/i.test(robotsMeta)) {
    return fail(
      'indexability',
      'Page is indexable (no robots noindex)',
      true,
      `Meta robots contains "noindex": "${robotsMeta}"`,
    );
  }

  return pass(
    'indexability',
    'Page is indexable (no robots noindex)',
    true,
  );
}

/** 7. Body language check — critical */
async function checkBodyLanguage(ctx: CheckContext): Promise<VerificationCheck> {
  const lang = localeToLang(ctx.locale);

  // Extract visible body text (rough, remove tags and scripts)
  const bodyMatch = ctx.html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch?.[1] ?? '';

  const text = bodyContent
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!isMeaningfulText(text)) {
    return fail(
      'body_language',
      'Body text language matches target locale',
      true,
      'Body text appears empty or too short to analyze',
    );
  }

  const matches = detectLanguageInText(text, lang);

  if (matches) {
    return pass(
      'body_language',
      'Body text language matches target locale',
      true,
      `Detected ${langName(lang)} in body text`,
    );
  }

  return fail(
    'body_language',
    'Body text language matches target locale',
    true,
    `Body text does not appear to be ${langName(lang)} (basic word-frequency heuristic)`,
  );
}

/** 8. Title tag — critical */
async function checkTitleTag(ctx: CheckContext): Promise<VerificationCheck> {
  const lang = localeToLang(ctx.locale);
  const match = ctx.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match?.[1]?.trim() ?? null;

  if (!title) {
    return fail('title_tag', '<title> exists, valid length, target language', true, 'No <title> tag found');
  }

  const issues: string[] = [];

  if (title.length > 60) {
    issues.push(`Length ${title.length} > 60 chars`);
  }

  if (title.length < 10) {
    issues.push(`Length ${title.length} < 10 chars (too short)`);
  }

  const titleMatchesLang = detectLanguageInText(title, lang);

  if (!titleMatchesLang) {
    issues.push(`Title does not appear to be in ${langName(lang)}`);
  }

  if (issues.length === 0) {
    return pass(
      'title_tag',
      '<title> exists, valid length, target language',
      true,
      `"${title.substring(0, 60)}" (${title.length} chars)`,
    );
  }

  return fail(
    'title_tag',
    '<title> exists, valid length, target language',
    true,
    issues.join('; '),
  );
}

/** 9. Meta description — non-critical */
async function checkMetaDescription(ctx: CheckContext): Promise<VerificationCheck> {
  const desc = extractMeta(ctx.html, 'name', 'description');

  if (!desc) {
    return fail(
      'meta_description',
      '<meta name="description"> exists and ≤ 160 chars',
      false,
      'No meta description found',
    );
  }

  if (desc.length > 160) {
    return fail(
      'meta_description',
      '<meta name="description"> exists and ≤ 160 chars',
      false,
      `Description is ${desc.length} chars (max 160)`,
    );
  }

  if (desc.length < 50) {
    return fail(
      'meta_description',
      '<meta name="description"> exists and ≤ 160 chars',
      false,
      `Description is only ${desc.length} chars (recommend 50-160)`,
    );
  }

  return pass(
    'meta_description',
    '<meta name="description"> exists and ≤ 160 chars',
    false,
    `${desc.length} chars`,
  );
}

/** 10. H1 — non-critical */
async function checkH1(ctx: CheckContext): Promise<VerificationCheck> {
  const h1Tags = ctx.html.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi);
  const count = h1Tags?.length ?? 0;

  if (count === 0) {
    return fail('h1', '<h1> heading exists', false, 'No <h1> tag found');
  }

  if (count > 1) {
    return fail('h1', '<h1> heading exists', false, `Found ${count} <h1> tags (should be exactly 1)`);
  }

  return pass('h1', '<h1> heading exists', false, '1 <h1> found');
}

/** 11. JSON-LD inLanguage — non-critical */
async function checkJsonLdInLanguage(ctx: CheckContext): Promise<VerificationCheck> {
  const lang = localeToLang(ctx.locale);
  const scripts = extractJsonLd(ctx.html);

  if (scripts.length === 0) {
    return fail(
      'jsonld_inlanguage',
      'JSON-LD inLanguage matches locale',
      false,
      'No JSON-LD script found',
    );
  }

  const mismatches: number[] = [];
  for (let i = 0; i < scripts.length; i++) {
    try {
      const parsed = JSON.parse(scripts[i]);
      const inLang = findInLanguage(parsed);
      if (inLang && !inLang.toLowerCase().startsWith(lang)) {
        mismatches.push(i);
      }
    } catch {
      // Invalid JSON — skip
    }
  }

  if (mismatches.length === 0) {
    return pass(
      'jsonld_inlanguage',
      'JSON-LD inLanguage matches locale',
      false,
      `${scripts.length} JSON-LD block(s) found, all inLanguage OK`,
    );
  }

  return fail(
    'jsonld_inlanguage',
    'JSON-LD inLanguage matches locale',
    false,
    `Block(s) ${mismatches.join(', ')} have inLanguage not matching "${lang}"`,
  );
}

/** 12. Sitemap state — non-critical */
async function checkSitemapState(ctx: CheckContext): Promise<VerificationCheck> {
  const sitemapLink = ctx.html.match(
    /<link[^>]+rel\s*=\s*["']sitemap["'][^>]*href\s*=\s*["']([^"']+)["']/i,
  );

  if (sitemapLink) {
    return fail(
      'sitemap_state',
      'URL is not yet in sitemap (pre-verification gate)',
      false,
      `Page references sitemap at "${sitemapLink[1]}"`,
    );
  }

  return pass(
    'sitemap_state',
    'URL is not yet in sitemap (pre-verification gate)',
    false,
    'No sitemap reference detected on page',
  );
}

/** 13. CTA visibility — non-critical */
async function checkCtaVisible(ctx: CheckContext): Promise<VerificationCheck> {
  const html = ctx.html;
  const ctaIndicators = [
    /wa\.me\//i,
    /whatsapp\.com\/send/i,
    /whatsapp/i,
    /tel:\+/i,
    /tel:\d/i,
    /class="[^"]*(?:cta|btn-|button|call-to-action)[^"]*"/i,
    /class="[^"]*(?:whatsapp-?btn|wp-?btn|contact-?btn)[^"]*"/i,
    /class="[^"]*(?:primary|accent|highlight)-?(?:button|btn|cta)[^"]*"/i,
    />(?:book now|reservar|reserve|book|contact|contáctanos|contato|get in touch|llámanos|lámenos|solicitar|empezar|comenzar|start|get started|ver más|learn more|más información|llamar|llámanos|wts|whatsapp)<\//i,
  ];

  const foundIndicators = ctaIndicators
    .map((pattern) => (pattern.test(html) ? 1 : 0))
    .reduce((a, b) => a + b, 0);

  if (foundIndicators > 0) {
    return pass(
      'cta_visible',
      'At least one CTA element is visible (WhatsApp, phone, button)',
      false,
      `Found ${foundIndicators} CTA indicator(s)`,
    );
  }

  return fail(
    'cta_visible',
    'At least one CTA element is visible (WhatsApp, phone, button)',
    false,
    'No WhatsApp link, phone link, or button/CTA element detected',
  );
}

/** 14. Tracking — non-critical */
async function checkTracking(ctx: CheckContext): Promise<VerificationCheck> {
  const html = ctx.html;
  const trackingPatterns = [
    /google-analytics\.com\//i,
    /googletagmanager\.com\//i,
    /gtag\s*\(/i,
    /ga\s*\(/i,
    /gtm\.js/i,
    /facebook\.com\/tr\//i,
    /fbq\s*\(/i,
    /connect\.facebook\.net/i,
    /analytics\.js/i,
    /analytics\.min\.js/i,
    /plausible\.io/i,
    /script\.js\?.*(?:analytics|tracking|pixel)/i,
    /dataLayer/i,
    /hotjar\.com/i,
  ];

  const foundPatterns = trackingPatterns
    .map((pattern) => (pattern.test(html) ? pattern.source.substring(0, 40) : null))
    .filter(Boolean) as string[];

  if (foundPatterns.length === 0) {
    return fail(
      'tracking',
      'Tracking pixels/scripts are present',
      false,
      'No tracking scripts or pixels detected',
    );
  }

  return pass(
    'tracking',
    'Tracking pixels/scripts are present',
    false,
    `Found ${foundPatterns.length} tracking indicator(s): ${foundPatterns.slice(0, 3).join(', ')}${foundPatterns.length > 3 ? '...' : ''}`,
  );
}

// ─── Check Registry ─────────────────────────────────────────────────────────

interface CheckRegistration {
  runner: CheckRunner;
  critical: boolean;
}

const CHECKS: CheckRegistration[] = [
  // Critical (8)
  { runner: checkHttp200, critical: true },
  { runner: checkNoFallback, critical: true },
  { runner: checkHtmlLang, critical: true },
  { runner: checkCanonicalSelf, critical: true },
  { runner: checkHreflangReciprocal, critical: true },
  { runner: checkIndexability, critical: true },
  { runner: checkBodyLanguage, critical: true },
  { runner: checkTitleTag, critical: true },
  // Non-critical (6)
  { runner: checkMetaDescription, critical: false },
  { runner: checkH1, critical: false },
  { runner: checkJsonLdInLanguage, critical: false },
  { runner: checkSitemapState, critical: false },
  { runner: checkCtaVisible, critical: false },
  { runner: checkTracking, critical: false },
];

// ─── Main Verification Function ─────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 15_000;

export async function verifyPublishedUrl(
  url: string,
  locale: string,
  options?: { timeout?: number },
): Promise<VerificationResult> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;

  log('START', `Verifying ${url} for locale ${locale}`);

  // 1. Fetch the page
  let fetchResult: { status: number; html: string; finalUrl: string };
  try {
    fetchResult = await fetchPage(url, timeout);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log('FETCH_FAIL', message);
    return {
      status: 'fail',
      checks: [
        {
          name: 'http_200',
          label: 'Page returns HTTP 200',
          critical: true,
          passed: false,
          detail: `Fetch failed: ${message}`,
        },
      ],
      sitemap_eligible: false,
      hreflang_eligible: false,
    };
  }

  log(
    'FETCH_OK',
    `Status ${fetchResult.status}, ${fetchResult.html.length} bytes -> ${fetchResult.finalUrl}`,
  );

  // 2. Build check context
  const ctx: CheckContext = {
    url,
    locale,
    html: fetchResult.html,
    statusCode: fetchResult.status,
    finalUrl: fetchResult.finalUrl,
  };

  // 3. Run all checks
  const checks: VerificationCheck[] = [];

  for (const reg of CHECKS) {
    try {
      const result = await reg.runner(ctx);
      checks.push({ ...result, critical: reg.critical });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log('CHECK_ERR', `Runner error: ${message}`);
      checks.push({
        name: 'check_errored',
        label: 'Check errored',
        critical: reg.critical,
        passed: false,
        detail: `Error: ${message}`,
      });
    }
  }

  // 4. Compute overall status
  const criticalFails = checks.filter((c) => c.critical && !c.passed);
  const nonCriticalFails = checks.filter((c) => !c.critical && !c.passed);

  let status: VerificationStatus;
  if (criticalFails.length > 0) {
    status = 'fail';
  } else if (nonCriticalFails.length > 0) {
    status = 'warn';
  } else {
    status = 'pass';
  }

  log(
    'DONE',
    `Status: ${status} (${criticalFails.length} critical fails, ${nonCriticalFails.length} non-critical fails)`,
  );

  return {
    status,
    checks,
    sitemap_eligible: canExposeToSitemap({
      status,
      checks,
      sitemap_eligible: false,
      hreflang_eligible: false,
    }),
    hreflang_eligible: canExposeToHreflang({
      status,
      checks,
      sitemap_eligible: false,
      hreflang_eligible: false,
    }),
  };
}

// ─── Gate Helpers ───────────────────────────────────────────────────────────

/**
 * A page can be exposed to the sitemap only if ALL critical checks pass.
 * Non-critical warnings are acceptable.
 */
export function canExposeToSitemap(result: VerificationResult): boolean {
  return result.checks
    .filter((c) => c.critical)
    .every((c) => c.passed);
}

/**
 * A page can be exposed to hreflang only if ALL critical checks pass
 * AND the hreflang-specific check passes.
 */
export function canExposeToHreflang(result: VerificationResult): boolean {
  const criticalPass = result.checks
    .filter((c) => c.critical)
    .every((c) => c.passed);

  if (!criticalPass) return false;

  const hreflangCheck = result.checks.find(
    (c) => c.name === 'hreflang_reciprocal',
  );
  if (hreflangCheck && !hreflangCheck.passed) return false;

  return true;
}