import { NextRequest, NextResponse } from 'next/server';
import { verifyOAuthState } from '@/lib/seo/state-token';
import { exchangeGoogleCode } from '@/lib/seo/google-client';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { autoConfigureGoogleIntegration, saveIntegrationCredentials } from '@/lib/seo/backend-service';

function withParams(base: string, params: Record<string, string>) {
  const url = new URL(base);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url;
}

export async function GET(request: NextRequest) {
  const reqUrl = request.nextUrl;
  const code = reqUrl.searchParams.get('code');
  const state = reqUrl.searchParams.get('state');
  const oauthError = reqUrl.searchParams.get('error');

  const fallback = new URL('/dashboard', reqUrl.origin);

  if (!state) {
    fallback.searchParams.set('integration_error', 'missing_state');
    return NextResponse.redirect(fallback);
  }

  let parsedState;
  try {
    parsedState = verifyOAuthState(state);
  } catch {
    fallback.searchParams.set('integration_error', 'invalid_state');
    return NextResponse.redirect(fallback);
  }

  const returnBase = parsedState.returnTo.startsWith('/')
    ? `${reqUrl.origin}${parsedState.returnTo}`
    : parsedState.returnTo;

  if (oauthError || !code) {
    const errorRedirect = withParams(returnBase, {
      integration_error: oauthError || 'missing_code',
      provider: parsedState.provider,
    });
    return NextResponse.redirect(errorRedirect);
  }

  try {
    const access = await requireWebsiteAccess(parsedState.websiteId);
    if (access.userId !== parsedState.userId) {
      const forbidden = withParams(returnBase, {
        integration_error: 'forbidden_user',
        provider: parsedState.provider,
      });
      return NextResponse.redirect(forbidden);
    }

    const token = await exchangeGoogleCode(code, parsedState.provider);

    await saveIntegrationCredentials(parsedState.websiteId, parsedState.provider, {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
      scope: token.scope,
      siteUrl: reqUrl.searchParams.get('site_url'),
      propertyId: reqUrl.searchParams.get('property_id'),
    });

    let autoConfigured = false;
    try {
      const result = await autoConfigureGoogleIntegration(parsedState.websiteId, parsedState.provider);
      autoConfigured = result.configured;
    } catch {
      // Ignore option discovery failures here; user can complete configuration manually in Config tab.
    }

    const success = withParams(returnBase, {
      integration_success: '1',
      provider: parsedState.provider,
      integration_config: autoConfigured ? 'auto' : 'required',
    });
    return NextResponse.redirect(success);
  } catch (error) {
    const failed = withParams(returnBase, {
      integration_error: 'callback_failed',
      provider: parsedState.provider,
      reason: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.redirect(failed);
  }
}
