import { NextRequest } from 'next/server';
import {
  SerpSnapshotRequestSchema,
  SerpSnapshotResponseSchema,
} from '@bukeer/website-contract';
import { apiError, apiRateLimited, apiSuccess } from '@/lib/api/response';
import { checkRateLimit } from '@/lib/ai/rate-limit';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import {
  SerpSnapshotError,
  getOrCreateSerpSnapshot,
} from '@/lib/seo/serp-snapshot';
import { withNoStoreHeaders } from '@/lib/seo/content-intelligence';

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
    const parsed = SerpSnapshotRequestSchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'Invalid SERP snapshot payload', 400, parsed.error.flatten()));
    }

    const access = await requireWebsiteAccess(parsed.data.websiteId);
    const rateCheck = await checkRateLimit(`${access.accountId}:seo:serp-snapshot`, 'editor');
    if (!rateCheck.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rateCheck.resetAt.getTime() - Date.now()) / 1000));
      return withNoStoreHeaders(apiRateLimited(retryAfterSeconds));
    }

    const snapshot = await getOrCreateSerpSnapshot({
      websiteId: parsed.data.websiteId,
      keyword: parsed.data.keyword,
      locale: parsed.data.locale,
      country: parsed.data.country,
      language: parsed.data.language,
      forceRefresh: parsed.data.forceRefresh,
    });

    const contractPayload = {
      keyword: snapshot.keyword,
      locale: snapshot.locale,
      country: snapshot.country,
      language: snapshot.language,
      cacheHit: snapshot.cacheHit,
      top10: snapshot.top10,
      peopleAlsoAsk: snapshot.peopleAlsoAsk,
      entities: snapshot.entities,
      source: snapshot.source,
      fetchedAt: snapshot.fetchedAt,
    };

    const validated = SerpSnapshotResponseSchema.safeParse(contractPayload);
    if (!validated.success) {
      return withNoStoreHeaders(
        apiError('INTERNAL_ERROR', 'Invalid SERP snapshot response shape', 500, validated.error.flatten()),
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
