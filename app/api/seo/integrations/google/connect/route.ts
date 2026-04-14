import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { signOAuthState } from '@/lib/seo/state-token';
import { buildGoogleAuthUrl } from '@/lib/seo/google-client';
import { toErrorResponse } from '@/lib/seo/errors';

const bodySchema = z.object({
  websiteId: z.string().uuid(),
  provider: z.enum(['gsc', 'ga4']),
  returnTo: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const access = await requireWebsiteAccess(body.websiteId);

    const returnTo = body.returnTo ?? `/dashboard/${body.websiteId}/analytics`;
    const state = signOAuthState({
      websiteId: body.websiteId,
      provider: body.provider,
      userId: access.userId,
      returnTo,
    });

    const authUrl = buildGoogleAuthUrl({ provider: body.provider, state });
    return NextResponse.json({ authUrl });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
