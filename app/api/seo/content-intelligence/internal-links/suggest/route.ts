/**
 * POST /api/seo/content-intelligence/internal-links/suggest
 *
 * Scans a body against the same-locale blog corpus and returns suggested
 * internal-link anchors. Preview-only — no writes.
 *
 * Envelope: ADR-012 ({ success, data } | { success: false, error }).
 *
 * @see issue #145
 */
import { NextRequest } from 'next/server';
import { InternalLinksSuggestRequestSchema } from '@bukeer/website-contract';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { toErrorResponse } from '@/lib/seo/errors';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import {
  scanBodyForLinkCandidates,
  type LinkCandidatePost,
} from '@/lib/seo/internal-link-scanner';
import {
  buildSourceMeta,
  withNoStoreHeaders,
} from '@/lib/seo/content-intelligence';

const DEFAULT_MAX_RESULTS = 5;
const HARD_CAP = 20;

export async function POST(request: NextRequest) {
  const bodyRaw = await request.json().catch(() => null);
  const parsed = InternalLinksSuggestRequestSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return withNoStoreHeaders(
      apiError('VALIDATION_ERROR', 'Invalid internal-links suggest payload', 400, parsed.error.flatten()),
    );
  }

  try {
    await requireWebsiteAccess(parsed.data.websiteId);
  } catch (err) {
    const res = toErrorResponse(err);
    const code = res.body.code ?? 'INTERNAL_ERROR';
    const message = res.body.error ?? 'Unauthorized';
    const details = 'details' in res.body ? res.body.details : undefined;
    return withNoStoreHeaders(apiError(code, message, res.status, details));
  }

  const admin = createSupabaseServiceRoleClient();

  // Limit corpus scan to published + same-locale posts, excluding self.
  const { data: corpusRows, error: corpusError } = await admin
    .from('website_blog_posts')
    .select('id, slug, title, seo_keywords')
    .eq('website_id', parsed.data.websiteId)
    .eq('locale', parsed.data.locale)
    .neq('id', parsed.data.pageId)
    .is('deleted_at', null)
    .limit(200);

  if (corpusError) {
    return withNoStoreHeaders(
      apiError('INTERNAL_ERROR', 'Unable to load same-locale corpus', 500, corpusError.message),
    );
  }

  const corpus: LinkCandidatePost[] = (corpusRows ?? [])
    .map((row) => ({
      id: String(row.id),
      slug: typeof row.slug === 'string' ? row.slug : '',
      title: typeof row.title === 'string' ? row.title : '',
      keywords: Array.isArray(row.seo_keywords)
        ? (row.seo_keywords as unknown[]).filter((kw): kw is string => typeof kw === 'string')
        : null,
    }))
    .filter((post) => post.slug.length > 0 && post.title.length > 0);

  const maxResults = Math.min(HARD_CAP, DEFAULT_MAX_RESULTS);
  const suggestions = scanBodyForLinkCandidates(parsed.data.content, corpus, maxResults);

  const sourceMeta = buildSourceMeta('seo-content-intelligence/internal-links/suggest', 'partial');

  return withNoStoreHeaders(
    apiSuccess({
      websiteId: parsed.data.websiteId,
      locale: parsed.data.locale,
      pageId: parsed.data.pageId,
      pageType: parsed.data.pageType,
      suggestions,
      count: suggestions.length,
      sourceMeta,
    }),
  );
}

export async function GET() {
  return withNoStoreHeaders(apiError('METHOD_NOT_ALLOWED', 'Use POST for internal-links/suggest', 405));
}
