/**
 * Translation Memory helpers (Issue #135).
 *
 * Provides TM lookup (exact + in-memory fuzzy), usage tracking, and upsert.
 * Used by the transcreate workflow to short-circuit drafts when we already
 * have a high-quality prior translation, and to grow the TM as applies happen.
 *
 * Fuzzy match strategy (v1): exact match by normalized source_text is
 * indexed-fast via (website_id, source_locale, target_locale, page_type).
 * When no exact hit exists we fetch up to `FUZZY_CANDIDATE_LIMIT` candidates
 * that share the same tuple and score trigram similarity in JavaScript.
 * This avoids shipping a new Postgres RPC in this migration; if TM volume
 * per tuple exceeds ~500 rows we'll promote fuzzy to a Postgres function
 * using `similarity(source_text, $1)` backed by `idx_tm_lookup_source_text_trgm`
 * (the gin_trgm_ops index is already in place from migration
 * `20260418000100_growth_ops_tables.sql`).
 *
 * @see packages/website-contract/src/schemas/translations.ts TranslationMemoryItemSchema
 */

import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TMMatch {
  id: string;
  sourceText: string;
  targetText: string;
  similarity: number; // 0..1 (1.0 = exact after normalization)
  usageCount: number;
  lastUsedAt: string | null;
}

export type TMPageType = 'blog' | 'page' | 'destination' | 'hotel' | 'activity' | 'package' | 'transfer';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_THRESHOLD = 0.85;
const DEFAULT_LIMIT = 5;
const FUZZY_CANDIDATE_LIMIT = 300;

// ---------------------------------------------------------------------------
// Normalization + similarity (trigram Jaccard)
// ---------------------------------------------------------------------------

/**
 * Normalize source/target text for comparison. Matches the loose semantics
 * Postgres `pg_trgm` uses (lowercase, collapsed whitespace) but stays in JS
 * so we don't need a dedicated RPC for exact matching.
 */
function normalizeForCompare(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function trigrams(input: string): Set<string> {
  const padded = `  ${input}  `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i += 1) {
    grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

/**
 * Trigram Jaccard similarity, in spirit of Postgres `similarity()` from
 * `pg_trgm`. Returns 0..1. Exact normalized match returns 1.
 */
function trigramSimilarity(a: string, b: string): number {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (na === nb) return 1;
  if (na.length === 0 || nb.length === 0) return 0;

  const gramsA = trigrams(na);
  const gramsB = trigrams(nb);
  let intersection = 0;
  for (const g of gramsA) {
    if (gramsB.has(g)) intersection += 1;
  }
  const union = gramsA.size + gramsB.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

// ---------------------------------------------------------------------------
// DB row shape
// ---------------------------------------------------------------------------

type TMRow = {
  id: string;
  website_id: string;
  source_locale: string;
  target_locale: string;
  page_type: string;
  source_text: string;
  target_text: string;
  usage_count: number | null;
  last_used_at: string | null;
  similarity_score: number | null;
  metadata: Record<string, unknown> | null;
};

function rowToMatch(row: TMRow, similarity: number): TMMatch {
  return {
    id: row.id,
    sourceText: row.source_text,
    targetText: row.target_text,
    similarity,
    usageCount: row.usage_count ?? 0,
    lastUsedAt: row.last_used_at,
  };
}

// ---------------------------------------------------------------------------
// findTMMatches
// ---------------------------------------------------------------------------

export interface FindTMMatchesParams {
  websiteId: string;
  sourceLocale: string;
  targetLocale: string;
  sourceText: string;
  /**
   * Optional context — treated as `page_type` on the TM table (the migration
   * uses `page_type` as the coarse-grained context column and builds
   * idx_tm_lookup on it). Callers passing e.g. `blog.title` will not
   * match; prefer passing a valid page_type.
   */
  context?: TMPageType | string;
  threshold?: number;
  limit?: number;
}

/**
 * Search translation memory for matches of `sourceText`.
 *
 * Algorithm:
 *   1. Normalize the source text and hit the indexed tuple
 *      (website_id, source_locale, target_locale[, page_type]) for an
 *      exact match. This is the 99% fast path.
 *   2. If no exact match, pull up to FUZZY_CANDIDATE_LIMIT candidates
 *      sharing the tuple and score trigram similarity in JS. Results
 *      above `threshold` are returned, sorted desc, limited to `limit`.
 *
 * Follow-up (flagged): promote fuzzy to a Postgres RPC
 * `tm_find_matches(website_id, source_locale, target_locale, source_text,
 * threshold, limit_n)` once per-tuple volume exceeds ~500 rows. Index
 * `idx_tm_lookup_source_text_trgm` (gin_trgm_ops) is already in place.
 */
export async function findTMMatches(params: FindTMMatchesParams): Promise<TMMatch[]> {
  const threshold = params.threshold ?? DEFAULT_THRESHOLD;
  const limit = params.limit ?? DEFAULT_LIMIT;
  const normalizedSource = normalizeForCompare(params.sourceText);
  if (normalizedSource.length === 0) return [];

  const admin = createSupabaseServiceRoleClient();

  const baseQuery = admin
    .from('seo_translation_memory')
    .select('id,website_id,source_locale,target_locale,page_type,source_text,target_text,usage_count,last_used_at,similarity_score,metadata')
    .eq('website_id', params.websiteId)
    .eq('source_locale', params.sourceLocale)
    .eq('target_locale', params.targetLocale);

  const pageTypeScoped = params.context
    ? baseQuery.eq('page_type', params.context)
    : baseQuery;

  // Fast path: exact normalized match via `ilike` (case-insensitive, safe
  // for users who typed the same segment previously).
  const exactQuery = (params.context ? pageTypeScoped : baseQuery)
    .ilike('source_text', params.sourceText.trim())
    .limit(limit);

  const { data: exactRows, error: exactError } = await exactQuery;
  if (exactError) {
    throw new Error(`TM exact lookup failed: ${exactError.message}`);
  }

  if (exactRows && exactRows.length > 0) {
    return exactRows
      .map((row) => rowToMatch(row as TMRow, 1))
      .slice(0, limit);
  }

  // Slow path: JS trigram scoring over a bounded candidate set.
  const { data: candidates, error: candidateError } = await (params.context ? pageTypeScoped : baseQuery).limit(FUZZY_CANDIDATE_LIMIT);
  if (candidateError) {
    throw new Error(`TM fuzzy candidate lookup failed: ${candidateError.message}`);
  }

  if (!candidates || candidates.length === 0) return [];

  const scored: Array<{ row: TMRow; similarity: number }> = [];
  for (const row of candidates as TMRow[]) {
    const sim = trigramSimilarity(params.sourceText, row.source_text);
    if (sim >= threshold) scored.push({ row, similarity: sim });
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit).map(({ row, similarity }) => rowToMatch(row, similarity));
}

// ---------------------------------------------------------------------------
// recordTMUsage
// ---------------------------------------------------------------------------

/**
 * Mark a TM row as used: increment usage_count, bump last_used_at.
 * Non-fatal: logs and swallows errors so the caller path stays fast.
 */
export async function recordTMUsage(tmId: string): Promise<void> {
  const admin = createSupabaseServiceRoleClient();

  const { data: current, error: fetchError } = await admin
    .from('seo_translation_memory')
    .select('usage_count')
    .eq('id', tmId)
    .maybeSingle();

  if (fetchError || !current) return;

  const nextCount = (current.usage_count ?? 0) + 1;
  await admin
    .from('seo_translation_memory')
    .update({
      usage_count: nextCount,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', tmId);
}

// ---------------------------------------------------------------------------
// upsertTM
// ---------------------------------------------------------------------------

export interface UpsertTMParams {
  websiteId: string;
  sourceLocale: string;
  targetLocale: string;
  sourceText: string;
  targetText: string;
  context?: TMPageType | string;
  qualityScore?: number;
  createdBy?: string;
}

/**
 * Insert or update a TM entry. When an entry already exists for the
 * (website, source_locale, target_locale, page_type, normalized source_text)
 * tuple we update its `target_text`, `similarity_score`, and timestamps so
 * the most recent human edit becomes the canonical translation.
 */
export async function upsertTM(params: UpsertTMParams): Promise<{ id: string }> {
  const admin = createSupabaseServiceRoleClient();
  const pageType = params.context ?? 'page';
  const now = new Date().toISOString();

  const { data: existing, error: lookupError } = await admin
    .from('seo_translation_memory')
    .select('id,usage_count')
    .eq('website_id', params.websiteId)
    .eq('source_locale', params.sourceLocale)
    .eq('target_locale', params.targetLocale)
    .eq('page_type', pageType)
    .ilike('source_text', params.sourceText.trim())
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`TM upsert lookup failed: ${lookupError.message}`);
  }

  if (existing?.id) {
    const { data: updated, error: updateError } = await admin
      .from('seo_translation_memory')
      .update({
        target_text: params.targetText,
        similarity_score: params.qualityScore ?? null,
        updated_at: now,
      })
      .eq('id', existing.id)
      .select('id')
      .single();

    if (updateError || !updated) {
      throw new Error(`TM upsert update failed: ${updateError?.message ?? 'unknown'}`);
    }
    return { id: String(updated.id) };
  }

  const insertPayload: Record<string, unknown> = {
    website_id: params.websiteId,
    source_locale: params.sourceLocale,
    target_locale: params.targetLocale,
    page_type: pageType,
    source_text: params.sourceText,
    target_text: params.targetText,
    similarity_score: params.qualityScore ?? null,
    source: 'transcreate',
    fetched_at: now,
    confidence: 'partial',
    usage_count: 0,
  };
  if (params.createdBy) insertPayload.created_by = params.createdBy;

  const { data: inserted, error: insertError } = await admin
    .from('seo_translation_memory')
    .insert(insertPayload)
    .select('id')
    .single();

  if (insertError || !inserted) {
    throw new Error(`TM upsert insert failed: ${insertError?.message ?? 'unknown'}`);
  }
  return { id: String(inserted.id) };
}

// ---------------------------------------------------------------------------
// Glossary prompt block (shared with transcreate workflow)
// ---------------------------------------------------------------------------

export interface GlossaryEntry {
  locale: string;
  term: string;
  translation: string;
  notes?: string | null;
}

/**
 * Load glossary entries for a website across two locales.
 *
 * The current schema only has (term, translation) — no isBrand flag yet.
 * Heuristic: entries where `term === translation` (same spelling across
 * locales) are treated as "do not translate" (brands, destinations).
 * Everything else becomes an "always translate as" directive.
 */
export async function loadGlossaryForLocales(params: {
  websiteId: string;
  locales: string[];
}): Promise<GlossaryEntry[]> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from('seo_translation_glossary')
    .select('locale,term,translation,notes')
    .eq('website_id', params.websiteId)
    .in('locale', params.locales);

  if (error || !data) return [];
  return data.map((row) => ({
    locale: String(row.locale),
    term: String(row.term),
    translation: String(row.translation),
    notes: (row.notes as string | null) ?? null,
  }));
}

/**
 * Render the glossary injection block appended to the LLM system prompt.
 * Format is stable and machine-parseable so downstream QA can detect
 * glossary violations.
 *
 * Example output:
 * ```
 * GLOSSARY RULES:
 * - NEVER TRANSLATE: Bukeer, Cartagena, Santa Marta
 * - ALWAYS TRANSLATE AS:
 *     "casa colonial" -> "colonial house"
 *     "todo incluido" -> "all inclusive"
 * ```
 */
export function buildGlossaryPromptBlock(entries: GlossaryEntry[]): string {
  if (!entries || entries.length === 0) return '';

  const doNotTranslate: string[] = [];
  const translateAs: Array<{ source: string; target: string }> = [];
  const seenSource = new Set<string>();

  for (const entry of entries) {
    const term = entry.term.trim();
    const translation = entry.translation.trim();
    if (!term) continue;

    if (normalizeForCompare(term) === normalizeForCompare(translation)) {
      if (!doNotTranslate.includes(term)) doNotTranslate.push(term);
      continue;
    }

    const key = normalizeForCompare(term);
    if (seenSource.has(key)) continue;
    seenSource.add(key);
    translateAs.push({ source: term, target: translation });
  }

  const lines = ['GLOSSARY RULES:'];
  if (doNotTranslate.length > 0) {
    lines.push(`- NEVER TRANSLATE: ${doNotTranslate.join(', ')}`);
  }
  if (translateAs.length > 0) {
    lines.push('- ALWAYS TRANSLATE AS:');
    for (const { source, target } of translateAs) {
      lines.push(`    "${source}" -> "${target}"`);
    }
  }

  if (lines.length === 1) return '';
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Draft enrichment helper (consumed by transcreate-workflow)
// ---------------------------------------------------------------------------

export interface TMHitEntry {
  field: string;
  tmId: string;
  sourceText: string;
  targetText: string;
  similarity: number;
  applied: boolean;
}

/**
 * For a transcreation draft payload, look up TM matches on each string
 * segment (title, seoTitle, seoDescription, body, seo_intro, etc.) and
 * return the hits plus a shallow-cloned payload where exact (sim === 1)
 * target fields are pre-filled from TM. Caller persists the returned
 * payload and stashes hits in job.metadata.tm_hits.
 */
export async function enrichDraftWithTM(params: {
  websiteId: string;
  sourceLocale: string;
  targetLocale: string;
  pageType: TMPageType | string;
  draft: Record<string, unknown>;
  sourceFields: Record<string, string | undefined>;
  threshold?: number;
}): Promise<{ payload: Record<string, unknown>; hits: TMHitEntry[] }> {
  const payload: Record<string, unknown> = { ...params.draft };
  const hits: TMHitEntry[] = [];
  const threshold = params.threshold ?? 0.95;

  for (const [field, sourceText] of Object.entries(params.sourceFields)) {
    if (!sourceText || typeof sourceText !== 'string' || sourceText.trim().length === 0) continue;

    let matches: TMMatch[] = [];
    try {
      matches = await findTMMatches({
        websiteId: params.websiteId,
        sourceLocale: params.sourceLocale,
        targetLocale: params.targetLocale,
        sourceText,
        context: params.pageType,
        threshold,
        limit: 1,
      });
    } catch {
      // TM lookup is best-effort — never block the draft path.
      continue;
    }

    const best = matches[0];
    if (!best) continue;

    const applyField = best.similarity === 1 && (payload[field] === undefined || payload[field] === null || payload[field] === '');
    if (applyField) {
      payload[field] = best.targetText;
      // best-effort usage tracking
      await recordTMUsage(best.id).catch(() => undefined);
    }

    hits.push({
      field,
      tmId: best.id,
      sourceText,
      targetText: best.targetText,
      similarity: best.similarity,
      applied: applyField,
    });
  }

  return { payload, hits };
}
