import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { syncSeoData } from '@/lib/seo/backend-service';
import { logSeoApiCall } from '@/lib/seo/api-call-logger';
import { toErrorResponse } from '@/lib/seo/errors';

const bodySchema = z.object({
  websiteId: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
  includeDataForSeo: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  let websiteIdForLog: string | null = null;

  try {
    const body = bodySchema.parse(await request.json());
    websiteIdForLog = body.websiteId;
    await requireWebsiteAccess(body.websiteId);

    const result = await syncSeoData(body.websiteId, requestId, {
      from: body.from,
      to: body.to,
      includeDataForSeo: body.includeDataForSeo,
    });

    return NextResponse.json({ requestId, ...result });
  } catch (error) {
    const mapped = toErrorResponse(error);
    if (websiteIdForLog) {
      await logSeoApiCall({
        websiteId: websiteIdForLog,
        provider: 'google',
        endpoint: 'sync:gsc+ga4',
        requestId,
        status: 'error',
        errorCode: (mapped.body as { code?: string }).code,
        errorMessage: (mapped.body as { error?: string }).error,
      });
    }

    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
