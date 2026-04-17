/**
 * Internal Link Scanner
 * ---------------------
 * Scans a body of HTML/markdown for n-gram matches against a corpus of
 * same-locale blog posts and returns link suggestions.
 *
 * Complements `lib/seo/internal-link-graph.ts` (which audits the inbound-link
 * graph at the website level). This module is text-level: given body copy
 * and a list of posts, it proposes anchor texts + positions where an internal
 * link could be inserted.
 *
 * @see issue #145
 */

export interface LinkCandidatePost {
  id: string;
  slug: string;
  title: string;
  /** Optional extra keywords/phrases that should trigger a suggestion. */
  keywords?: string[] | null;
}

export interface InternalLinkSuggestion {
  sourceContentId: string; // post id that would be linked to
  slug: string;
  title: string;
  anchor: string; // phrase in the body that would become the anchor
  matchText: string; // same as anchor, kept for clarity
  position: number; // character offset inside body where the match starts
  score: number; // 0..1 relevance (title=1, keyword=0.7, token overlap=0.4)
}

/**
 * Strip HTML tags for plain-text scanning. We keep offsets inside the
 * stripped text — callers use it only for anchor detection, not injection.
 */
function stripHtml(body: string): string {
  return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Normalize for comparison (lowercase, NFD-ascii-fold).
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Escape a string for safe use inside a regex.
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Return the first case-insensitive match offset of `phrase` in `haystack`
 * using word-boundary matching. Returns -1 when not found.
 */
function findPhrasePosition(haystack: string, phrase: string): { position: number; matchText: string } | null {
  if (!phrase.trim()) return null;
  const escaped = escapeRegex(phrase.trim());
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu');
  const match = re.exec(haystack);
  if (!match) return null;
  return { position: match.index, matchText: match[0] };
}

/**
 * Suggest internal-link candidates for a body against a corpus of posts.
 *
 * Rules (requested in issue #145):
 *  - One suggestion per target post (no duplicates).
 *  - First match wins for each target (earliest offset).
 *  - Score priority: title match (1.0) > keyword match (0.7) > title-token
 *    overlap (0.4). Below-threshold matches dropped.
 *
 * @param body        The body text (HTML or plain). HTML is stripped for
 *                    matching; callers inject against their own copy.
 * @param corpus      Candidate target posts (same locale, excluding self).
 * @param maxResults  Cap on suggestions returned. Default 5.
 */
export function scanBodyForLinkCandidates(
  body: string,
  corpus: LinkCandidatePost[],
  maxResults = 5,
): InternalLinkSuggestion[] {
  if (!body || corpus.length === 0) return [];

  const plain = stripHtml(body);
  const haystack = normalize(plain);

  const suggestions: InternalLinkSuggestion[] = [];
  const seenPostIds = new Set<string>();

  for (const post of corpus) {
    if (seenPostIds.has(post.id)) continue;

    const candidates: Array<{ phrase: string; score: number }> = [];
    if (post.title) candidates.push({ phrase: post.title, score: 1.0 });
    if (post.keywords) {
      for (const kw of post.keywords) {
        if (typeof kw === 'string' && kw.trim().length >= 3) {
          candidates.push({ phrase: kw, score: 0.7 });
        }
      }
    }

    let best: { position: number; matchText: string; score: number } | null = null;

    for (const cand of candidates) {
      const normalizedPhrase = normalize(cand.phrase);
      const hit = findPhrasePosition(haystack, normalizedPhrase);
      if (!hit) continue;
      if (!best || hit.position < best.position) {
        // Recover the original casing from the plain-text body for display.
        const originalMatch = plain.slice(hit.position, hit.position + hit.matchText.length);
        best = { position: hit.position, matchText: originalMatch, score: cand.score };
      }
    }

    if (!best) continue;

    suggestions.push({
      sourceContentId: post.id,
      slug: post.slug,
      title: post.title,
      anchor: best.matchText,
      matchText: best.matchText,
      position: best.position,
      score: best.score,
    });
    seenPostIds.add(post.id);

    if (suggestions.length >= maxResults) break;
  }

  // Sort by score desc, then earliest position
  suggestions.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.position - b.position;
  });

  return suggestions.slice(0, maxResults);
}

/**
 * Inject anchor links into the body for each suggestion. Only the first
 * occurrence of each anchor is wrapped (word-boundary). Returns the
 * updated body and the list of suggestions that were actually injected.
 *
 * Does NOT sanitize the result — call `sanitizeContentHtml` afterwards.
 */
export function injectInternalLinks(
  body: string,
  suggestions: InternalLinkSuggestion[],
  options: { locale: string; maxInjections?: number },
): { body: string; injected: InternalLinkSuggestion[] } {
  const maxInjections = options.maxInjections ?? 5;
  let output = body;
  const injected: InternalLinkSuggestion[] = [];
  const usedPostIds = new Set<string>();

  for (const sug of suggestions) {
    if (injected.length >= maxInjections) break;
    if (usedPostIds.has(sug.sourceContentId)) continue;

    const escaped = escapeRegex(sug.anchor);
    // Word-boundary, case-insensitive, FIRST match only.
    // Skip matches already inside an <a> tag to avoid nested anchors.
    const re = new RegExp(`(?<!<a\\b[^>]*>[^<]*)(?<![\\p{L}\\p{N}])(${escaped})(?![\\p{L}\\p{N}])(?![^<]*</a>)`, 'iu');
    const match = re.exec(output);
    if (!match) continue;

    const href = `/${options.locale}/blog/${sug.slug}`;
    const replacement = `<a href="${href}">${match[1]}</a>`;
    output = output.slice(0, match.index) + replacement + output.slice(match.index + match[0].length);

    injected.push(sug);
    usedPostIds.add(sug.sourceContentId);
  }

  return { body: output, injected };
}
