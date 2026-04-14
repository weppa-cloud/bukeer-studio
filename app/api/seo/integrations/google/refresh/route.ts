import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { refreshIntegrationToken } from '@/lib/seo/backend-service';
import { toErrorResponse } from '@/lib/seo/errors';

const bodySchema = z.object({
  websiteId: z.string().uuid(),
  provider: z.enum(['gsc', 'ga4']),
});

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    await requireWebsiteAccess(body.websiteId);
    const result = await refreshIntegrationToken(body.websiteId, body.provider);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
