import { NextRequest, NextResponse } from 'next/server';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { getGoogleIntegrationOptions } from '@/lib/seo/backend-service';
import { toErrorResponse } from '@/lib/seo/errors';

export async function GET(request: NextRequest) {
  try {
    const websiteId = request.nextUrl.searchParams.get('websiteId');
    const provider = request.nextUrl.searchParams.get('provider');

    if (!websiteId || !provider || !['gsc', 'ga4'].includes(provider)) {
      return NextResponse.json(
        { error: 'websiteId and provider (gsc|ga4) are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    await requireWebsiteAccess(websiteId);
    const options = await getGoogleIntegrationOptions(websiteId, provider as 'gsc' | 'ga4');
    return NextResponse.json({ options });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
