import { SeoApiError } from '@/lib/seo/errors';

const GOOGLE_OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SEARCH_CONSOLE_ENDPOINT = 'https://searchconsole.googleapis.com/webmasters/v3/sites';
const GA4_ENDPOINT_BASE = 'https://analyticsdata.googleapis.com/v1beta';
const GA4_ADMIN_ENDPOINT = 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries';

function requiredGoogleClientEnv() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_GSC_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_GSC_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new SeoApiError(
      'UPSTREAM_UNAVAILABLE',
      'Google OAuth is not configured. Missing GOOGLE_OAUTH_CLIENT_ID/SECRET',
      503
    );
  }

  return { clientId, clientSecret };
}

function requiredGoogleRedirectUri(provider: 'gsc' | 'ga4') {
  const redirectUri =
    provider === 'ga4'
      ? process.env.GOOGLE_OAUTH_REDIRECT_URI ||
        process.env.GOOGLE_GA4_REDIRECT_URI ||
        process.env.GOOGLE_GSC_REDIRECT_URI
      : process.env.GOOGLE_OAUTH_REDIRECT_URI ||
        process.env.GOOGLE_GSC_REDIRECT_URI ||
        process.env.GOOGLE_GA4_REDIRECT_URI;

  if (!redirectUri) {
    throw new SeoApiError(
      'UPSTREAM_UNAVAILABLE',
      'Google OAuth is not configured. Missing GOOGLE_OAUTH_REDIRECT_URI (or legacy GOOGLE_GSC/GA4_REDIRECT_URI)',
      503
    );
  }

  return redirectUri;
}

export function buildGoogleAuthUrl(args: {
  provider: 'gsc' | 'ga4';
  state: string;
  prompt?: 'consent' | 'none';
}) {
  const { clientId } = requiredGoogleClientEnv();
  const redirectUri = requiredGoogleRedirectUri(args.provider);
  const scopes =
    args.provider === 'gsc'
      ? [
          'https://www.googleapis.com/auth/webmasters.readonly',
          'https://www.googleapis.com/auth/analytics.readonly',
        ]
      : ['https://www.googleapis.com/auth/analytics.readonly'];

  const url = new URL(GOOGLE_OAUTH_BASE);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', args.prompt ?? 'consent');
  url.searchParams.set('state', args.state);

  return url.toString();
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

export async function exchangeGoogleCode(code: string, provider: 'gsc' | 'ga4'): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = requiredGoogleClientEnv();
  const redirectUri = requiredGoogleRedirectUri(provider);

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 429) {
      throw new SeoApiError('RATE_LIMIT', 'Google OAuth rate limited', 429, text);
    }
    throw new SeoApiError('UPSTREAM_UNAVAILABLE', 'Failed to exchange Google auth code', 502, text);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function refreshGoogleToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = requiredGoogleClientEnv();

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 429) {
      throw new SeoApiError('RATE_LIMIT', 'Google token refresh rate limited', 429, text);
    }
    throw new SeoApiError('AUTH_EXPIRED', 'Failed to refresh Google token', 401, text);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export interface SearchConsoleRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

export interface SearchConsoleSiteOption {
  siteUrl: string;
  permissionLevel?: string;
}

export async function listSearchConsoleSites(accessToken: string): Promise<SearchConsoleSiteOption[]> {
  const response = await fetch(SEARCH_CONSOLE_ENDPOINT, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      throw new SeoApiError('AUTH_EXPIRED', 'Google Search Console token expired', 401, text);
    }
    if (response.status === 429) {
      throw new SeoApiError('RATE_LIMIT', 'Search Console rate limit', 429, text);
    }
    throw new SeoApiError('UPSTREAM_UNAVAILABLE', 'Failed to list Search Console sites', 502, text);
  }

  const data = (await response.json()) as {
    siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }>;
  };

  return (data.siteEntry ?? [])
    .filter((site) => typeof site.siteUrl === 'string' && site.siteUrl.length > 0)
    .map((site) => ({
      siteUrl: site.siteUrl!,
      permissionLevel: site.permissionLevel,
    }));
}

export async function querySearchConsole(args: {
  accessToken: string;
  siteUrl: string;
  body: Record<string, unknown>;
}) {
  const encodedSite = encodeURIComponent(args.siteUrl);
  const endpoint = `${SEARCH_CONSOLE_ENDPOINT}/${encodedSite}/searchAnalytics/query`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args.body),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      throw new SeoApiError('AUTH_EXPIRED', 'Google Search Console token expired', 401, text);
    }
    if (response.status === 429) {
      throw new SeoApiError('RATE_LIMIT', 'Search Console rate limit', 429, text);
    }
    throw new SeoApiError('UPSTREAM_UNAVAILABLE', 'Search Console query failed', 502, text);
  }

  const data = (await response.json()) as { rows?: SearchConsoleRow[] };
  return data.rows ?? [];
}

export interface Ga4Row {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}

export interface Ga4PropertyOption {
  propertyId: string;
  displayName: string;
  accountDisplayName?: string;
}

export async function listGa4Properties(accessToken: string): Promise<Ga4PropertyOption[]> {
  const response = await fetch(GA4_ADMIN_ENDPOINT, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      throw new SeoApiError('AUTH_EXPIRED', 'Google Analytics token expired', 401, text);
    }
    if (response.status === 429) {
      throw new SeoApiError('RATE_LIMIT', 'GA4 rate limit', 429, text);
    }
    throw new SeoApiError('UPSTREAM_UNAVAILABLE', 'Failed to list GA4 properties', 502, text);
  }

  const data = (await response.json()) as {
    accountSummaries?: Array<{
      displayName?: string;
      propertySummaries?: Array<{
        property?: string;
        displayName?: string;
      }>;
    }>;
  };

  const out: Ga4PropertyOption[] = [];
  for (const account of data.accountSummaries ?? []) {
    for (const property of account.propertySummaries ?? []) {
      const propertyRef = property.property ?? '';
      const propertyId = propertyRef.startsWith('properties/')
        ? propertyRef.replace('properties/', '')
        : propertyRef;
      if (!propertyId) continue;
      out.push({
        propertyId,
        displayName: property.displayName ?? propertyId,
        accountDisplayName: account.displayName,
      });
    }
  }

  return out;
}

export async function runGa4Report(args: {
  accessToken: string;
  propertyId: string;
  body: Record<string, unknown>;
}) {
  const endpoint = `${GA4_ENDPOINT_BASE}/properties/${args.propertyId}:runReport`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args.body),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      throw new SeoApiError('AUTH_EXPIRED', 'Google Analytics token expired', 401, text);
    }
    if (response.status === 429) {
      throw new SeoApiError('RATE_LIMIT', 'GA4 rate limit', 429, text);
    }
    throw new SeoApiError('UPSTREAM_UNAVAILABLE', 'GA4 report query failed', 502, text);
  }

  const data = (await response.json()) as { rows?: Ga4Row[] };
  return data.rows ?? [];
}
