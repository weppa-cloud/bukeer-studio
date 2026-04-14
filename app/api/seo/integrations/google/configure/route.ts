import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { configureGoogleIntegration, getIntegrationStatus } from '@/lib/seo/backend-service';
import { toErrorResponse } from '@/lib/seo/errors';

const bodySchema = z.object({
  websiteId: z.string().uuid(),
  provider: z.enum(['gsc', 'ga4']),
  siteUrl: z.string().min(1).optional(),
  propertyId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    await requireWebsiteAccess(body.websiteId);

    await configureGoogleIntegration(body.websiteId, body.provider, {
      siteUrl: body.siteUrl,
      propertyId: body.propertyId,
    });

    const status = await getIntegrationStatus(body.websiteId);
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
