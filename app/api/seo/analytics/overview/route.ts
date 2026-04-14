import { NextRequest, NextResponse } from 'next/server';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { getOverview } from '@/lib/seo/backend-service';
import { toErrorResponse } from '@/lib/seo/errors';

export async function GET(request: NextRequest) {
  try {
    const websiteId = request.nextUrl.searchParams.get('websiteId');
    if (!websiteId) {
      return NextResponse.json({ error: 'websiteId is required', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    await requireWebsiteAccess(websiteId);
    const data = await getOverview(websiteId, {
      from: request.nextUrl.searchParams.get('from'),
      to: request.nextUrl.searchParams.get('to'),
    });

    return NextResponse.json(data);
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
