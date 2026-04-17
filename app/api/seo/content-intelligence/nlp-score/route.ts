import { NextRequest } from 'next/server';
import {
  NlpScoreRequestSchema,
  NlpScoreResponseSchema,
} from '@bukeer/website-contract';
import { apiError, apiRateLimited, apiSuccess } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/ai/rate-limit';
import { withNoStoreHeaders } from '@/lib/seo/content-intelligence';
import { buildNlpScore } from '@/lib/seo/nlp-score';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import {
  SerpSnapshotError,
  getOrCreateSerpSnapshot,
} from '@/lib/seo/serp-snapshot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeError(error: unknown): {
  code: string;
  message: string;
  status: number;
  details?: unknown;
} {
  if (error instanceof SerpSnapshotError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
      details: error.details,
    };
  }

  if (error && typeof error === 'object' && 'code' in error && 'message' in error && 'status' in error) {
    const candidate = error as {
      code?: string;
      message?: string;
      status?: number;
      details?: unknown;
    };
    return {
      code: candidate.code ?? 'INTERNAL_ERROR',
      message: candidate.message ?? 'Internal server error',
      status: candidate.status ?? 500,
      details: candidate.details,
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    status: 500,
  };
}

export async function POST(request: NextRequest) {
  try {
    const bodyRaw = await request.json().catch(() => null);
    const parsed = NlpScoreRequestSchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'Invalid NLP score payload', 400, parsed.error.flatten()));
    }

    const access = await requireWebsiteAccess(parsed.data.websiteId);
    const rateCheck = await checkRateLimit(`${access.accountId}:seo:nlp-score`, 'editor');
    if (!rateCheck.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rateCheck.resetAt.getTime() - Date.now()) / 1000));
      return withNoStoreHeaders(apiRateLimited(retryAfterSeconds));
    }

    const localeParts = parsed.data.locale.split('-');
    const language = localeParts[0] ?? 'en';
    const country = localeParts[1] ?? 'US';

    const snapshot = await getOrCreateSerpSnapshot({
      websiteId: parsed.data.websiteId,
      keyword: parsed.data.keyword,
      locale: parsed.data.locale,
      country,
      language,
      forceRefresh: false,
    });

    const computed = buildNlpScore({
      keyword: parsed.data.keyword,
      content: parsed.data.content,
      snapshot,
    });

    const validated = NlpScoreResponseSchema.safeParse(computed);
    if (!validated.success) {
      return withNoStoreHeaders(
        apiError('INTERNAL_ERROR', 'Invalid NLP score response shape', 500, validated.error.flatten()),
      );
    }

    return withNoStoreHeaders(
      apiSuccess({
        ...validated.data,
        sourceMeta: {
          source: snapshot.source,
          fetchedAt: snapshot.fetchedAt,
          confidence: snapshot.confidence,
        },
      }),
    );
  } catch (error) {
    const normalized = normalizeError(error);
    return withNoStoreHeaders(apiError(normalized.code, normalized.message, normalized.status, normalized.details));
  }
}
