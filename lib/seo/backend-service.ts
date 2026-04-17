import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import type {
  AnalyticsOverviewDTO,
  CompetitorRowDTO,
  HealthAuditDTO,
  IntegrationStatusDTO,
  KeywordRowDTO,
} from '@/lib/seo/dto';
import { SeoApiError } from '@/lib/seo/errors';
import {
  listGa4Properties,
  listSearchConsoleSites,
  querySearchConsole,
  refreshGoogleToken,
  runGa4Report,
  type SearchConsoleRow,
} from '@/lib/seo/google-client';
import { logSeoApiCall } from '@/lib/seo/api-call-logger';

interface CredentialRow {
  id: string;
  website_id: string;
  provider: 'gsc' | 'ga4';
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
  site_url: string | null;
  property_id: string | null;
  scopes: string[] | null;
  last_error: string | null;
}

export interface GoogleIntegrationOption {
  value: string;
  label: string;
  meta?: string;
}

function toIsoDate(input: Date): string {
  return input.toISOString().slice(0, 10);
}

function hasDataForSeoCredentials() {
  if (process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD) {
    return true;
  }

  const legacy = process.env.DATAFORSEO_CREDENTIALS;
  if (!legacy) return false;

  try {
    const parsed = JSON.parse(legacy) as { login?: string; password?: string };
    if (parsed.login && parsed.password) return true;
  } catch {
    // Fallback for "login:password" legacy format
  }

  const separatorIndex = legacy.indexOf(':');
  if (separatorIndex <= 0) return false;
  const login = legacy.slice(0, separatorIndex).trim();
  const password = legacy.slice(separatorIndex + 1).trim();
  return Boolean(login && password);
}

function parseDateRange(from?: string | null, to?: string | null) {
  const now = new Date();
  const end = to ? new Date(to) : now;
  const start = from ? new Date(from) : new Date(end.getTime() - 1000 * 60 * 60 * 24 * 29);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new SeoApiError('VALIDATION_ERROR', 'Invalid date range', 400);
  }

  if (start > end) {
    throw new SeoApiError('VALIDATION_ERROR', 'from cannot be greater than to', 400);
  }

  return { from: toIsoDate(start), to: toIsoDate(end) };
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    attempts?: number;
    baseDelayMs?: number;
  } = {}
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 400;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const code = error instanceof SeoApiError ? error.code : 'INTERNAL_ERROR';
      const retryable = code === 'RATE_LIMIT' || code === 'UPSTREAM_UNAVAILABLE' || code === 'AUTH_EXPIRED';
      if (!retryable || attempt === attempts) {
        break;
      }

      const jitter = Math.floor(Math.random() * 120);
      const delay = baseDelayMs * 2 ** (attempt - 1) + jitter;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new SeoApiError('INTERNAL_ERROR', 'Retry pipeline failed', 500);
}

async function getCredentialMap(websiteId: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from('seo_gsc_credentials')
    .select('id, website_id, provider, access_token, refresh_token, token_expiry, site_url, property_id, scopes, last_error')
    .eq('website_id', websiteId);

  if (error) {
    throw new SeoApiError('INTERNAL_ERROR', 'Failed to load credentials', 500, error.message);
  }

  const map = new Map<'gsc' | 'ga4', CredentialRow>();
  for (const row of (data ?? []) as CredentialRow[]) {
    map.set(row.provider, row);
  }

  return map;
}

async function upsertCredential(websiteId: string, provider: 'gsc' | 'ga4', patch: Partial<CredentialRow>) {
  const supabase = createSupabaseServiceRoleClient();
  const payload = {
    website_id: websiteId,
    provider,
    access_token: patch.access_token ?? null,
    refresh_token: patch.refresh_token ?? null,
    token_expiry: patch.token_expiry ?? null,
    site_url: patch.site_url ?? null,
    property_id: patch.property_id ?? null,
    scopes: patch.scopes ?? [],
    last_error: patch.last_error ?? null,
    connected_at: patch.access_token ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('seo_gsc_credentials')
    .upsert(payload, { onConflict: 'website_id,provider' });

  if (error) {
    throw new SeoApiError('INTERNAL_ERROR', `Failed to persist ${provider} credentials`, 500, error.message);
  }
}

async function ensureFreshToken(websiteId: string, credential: CredentialRow): Promise<CredentialRow> {
  const expiresAt = credential.token_expiry ? new Date(credential.token_expiry).getTime() : 0;
  const nowPlusFiveMinutes = Date.now() + 5 * 60 * 1000;

  if (credential.access_token && expiresAt > nowPlusFiveMinutes) {
    return credential;
  }

  if (!credential.refresh_token) {
    throw new SeoApiError('AUTH_EXPIRED', `Refresh token missing for ${credential.provider}`, 401);
  }

  const refreshed = await refreshGoogleToken(credential.refresh_token);
  const next: CredentialRow = {
    ...credential,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? credential.refresh_token,
    token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    scopes: refreshed.scope ? refreshed.scope.split(' ') : credential.scopes,
    last_error: null,
  };

  await upsertCredential(websiteId, credential.provider, next);
  return next;
}

export async function getFreshCredential(websiteId: string, provider: 'gsc' | 'ga4') {
  const credentials = await getCredentialMap(websiteId);
  const credential = credentials.get(provider);
  if (!credential) {
    throw new SeoApiError('INTEGRATION_NOT_CONNECTED', `${provider.toUpperCase()} is not connected`, 400);
  }
  return ensureFreshToken(websiteId, credential);
}

export async function getIntegrationStatus(websiteId: string): Promise<IntegrationStatusDTO> {
  const creds = await getCredentialMap(websiteId);

  const gsc = creds.get('gsc');
  const ga4 = creds.get('ga4');

  return {
    websiteId,
    gsc: {
      connected: !!gsc?.access_token,
      configurationComplete: Boolean(gsc?.access_token && gsc?.site_url),
      tokenExpiry: gsc?.token_expiry ?? null,
      siteUrl: gsc?.site_url ?? null,
      lastError: gsc?.last_error ?? null,
    },
    ga4: {
      connected: !!ga4?.access_token,
      configurationComplete: Boolean(ga4?.access_token && ga4?.property_id),
      tokenExpiry: ga4?.token_expiry ?? null,
      propertyId: ga4?.property_id ?? null,
      lastError: ga4?.last_error ?? null,
    },
    dataforseo: {
      connected: hasDataForSeoCredentials(),
      enabled: process.env.DATAFORSEO_ENABLED === 'true' || Boolean(process.env.DATAFORSEO_CREDENTIALS),
    },
  };
}

async function upsertGa4Metrics(websiteId: string, rows: Array<{ date: string; pagePath: string; sessions: number; users: number; pageviews: number; conversions: number; bounceRate: number | null; avgSessionDuration: number | null }>) {
  if (!rows.length) return;

  const supabase = createSupabaseServiceRoleClient();
  const payload = rows.map((row) => ({
    website_id: websiteId,
    metric_date: row.date,
    page_path: row.pagePath,
    sessions: row.sessions,
    users: row.users,
    pageviews: row.pageviews,
    conversions: row.conversions,
    bounce_rate: row.bounceRate,
    avg_session_duration: row.avgSessionDuration,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('seo_ga4_page_metrics')
    .upsert(payload, { onConflict: 'website_id,metric_date,page_path' });

  if (error) {
    throw new SeoApiError('INTERNAL_ERROR', 'Failed to store GA4 metrics', 500, error.message);
  }
}

async function upsertGscKeywords(websiteId: string, rows: SearchConsoleRow[]) {
  if (!rows.length) return;
  const supabase = createSupabaseServiceRoleClient();

  for (const row of rows) {
    const keyword = row.keys?.[0]?.trim();
    const date = row.keys?.[1];
    if (!keyword || !date) continue;

    const { data: keywordRow, error: keywordError } = await supabase
      .from('seo_keywords')
      .upsert(
        {
          website_id: websiteId,
          keyword,
          locale: 'es',
          target_url: null,
        },
        { onConflict: 'website_id,keyword,locale' }
      )
      .select('id')
      .single();

    if (keywordError || !keywordRow) {
      throw new SeoApiError('INTERNAL_ERROR', 'Failed to upsert SEO keyword', 500, keywordError?.message);
    }

    const { error: snapshotError } = await supabase
      .from('seo_keyword_snapshots')
      .upsert(
        {
          keyword_id: keywordRow.id,
          snapshot_date: date,
          position: row.position ?? null,
          search_volume: null,
        },
        { onConflict: 'keyword_id,snapshot_date' }
      );

    if (snapshotError) {
      throw new SeoApiError('INTERNAL_ERROR', 'Failed to upsert SEO keyword snapshot', 500, snapshotError.message);
    }
  }
}

function parseNumber(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getSearchConsoleRowLimit(): number {
  const raw = process.env.SEO_GSC_SYNC_ROW_LIMIT;
  const parsed = raw ? Number(raw) : 2500;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 2500;
  }
  return Math.min(Math.floor(parsed), 25000);
}

export async function syncSeoData(
  websiteId: string,
  requestId: string,
  params: { from?: string | null; to?: string | null; includeDataForSeo?: boolean }
) {
  const startedAt = Date.now();
  const { from, to } = parseDateRange(params.from, params.to);
  const credentials = await getCredentialMap(websiteId);

  const gscCredential = credentials.get('gsc');
  const ga4Credential = credentials.get('ga4');

  if (!gscCredential?.access_token) {
    throw new SeoApiError('INTEGRATION_NOT_CONNECTED', 'Search Console is not connected', 400);
  }

  if (!ga4Credential?.access_token || !ga4Credential.property_id) {
    throw new SeoApiError('INTEGRATION_NOT_CONNECTED', 'Google Analytics is not connected', 400);
  }

  if (!gscCredential.site_url) {
    throw new SeoApiError('VALIDATION_ERROR', 'GSC site_url is required in credentials', 400);
  }

  const freshGsc = await ensureFreshToken(websiteId, gscCredential);
  const freshGa4 = await ensureFreshToken(websiteId, ga4Credential);

  const gscRows = await withRetry(() =>
    querySearchConsole({
      accessToken: freshGsc.access_token!,
      siteUrl: freshGsc.site_url!,
      body: {
        startDate: from,
        endDate: to,
        dimensions: ['query', 'date'],
        rowLimit: getSearchConsoleRowLimit(),
      },
    })
  );

  await upsertGscKeywords(websiteId, gscRows);

  const ga4Rows = await withRetry(() =>
    runGa4Report({
      accessToken: freshGa4.access_token!,
      propertyId: freshGa4.property_id!,
      body: {
        dateRanges: [{ startDate: from, endDate: to }],
        dimensions: [{ name: 'date' }, { name: 'pagePath' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'conversions' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        limit: 1000,
        keepEmptyRows: false,
      },
    })
  );

  const metricsPayload = ga4Rows.map((row) => {
    const dimensions = row.dimensionValues ?? [];
    const metrics = row.metricValues ?? [];
    const gaDate = dimensions[0]?.value ?? from;
    const isoDate = `${gaDate.slice(0, 4)}-${gaDate.slice(4, 6)}-${gaDate.slice(6, 8)}`;

    return {
      date: isoDate,
      pagePath: dimensions[1]?.value ?? '/',
      sessions: parseNumber(metrics[0]?.value),
      users: parseNumber(metrics[1]?.value),
      pageviews: parseNumber(metrics[2]?.value),
      conversions: parseNumber(metrics[3]?.value),
      bounceRate: parseNumber(metrics[4]?.value, 0),
      avgSessionDuration: parseNumber(metrics[5]?.value, 0),
    };
  });

  await upsertGa4Metrics(websiteId, metricsPayload);

  const durationMs = Date.now() - startedAt;
  await logSeoApiCall({
    websiteId,
    provider: 'google',
    endpoint: 'sync:gsc+ga4',
    requestId,
    status: 'success',
    rowCount: gscRows.length + metricsPayload.length,
    estimatedCost: 0,
    latencyMs: durationMs,
    metadata: {
      from,
      to,
      includeDataForSeo: Boolean(params.includeDataForSeo),
      gscRows: gscRows.length,
      ga4Rows: metricsPayload.length,
    },
  });

  return {
    from,
    to,
    gscRows: gscRows.length,
    ga4Rows: metricsPayload.length,
    dataforseo: params.includeDataForSeo ? 'skipped_optional' : 'disabled',
    durationMs,
  };
}

export async function getOverview(
  websiteId: string,
  params: { from?: string | null; to?: string | null }
): Promise<AnalyticsOverviewDTO> {
  const { from, to } = parseDateRange(params.from, params.to);
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from('seo_ga4_page_metrics')
    .select('metric_date, page_path, sessions, users, pageviews, conversions, bounce_rate, avg_session_duration')
    .eq('website_id', websiteId)
    .gte('metric_date', from)
    .lte('metric_date', to);

  if (error) {
    throw new SeoApiError('INTERNAL_ERROR', 'Failed to load GA4 overview', 500, error.message);
  }

  const rows = data ?? [];
  const totals = rows.reduce(
    (acc, row) => {
      acc.sessions += row.sessions ?? 0;
      acc.users += row.users ?? 0;
      acc.pageviews += row.pageviews ?? 0;
      acc.conversions += row.conversions ?? 0;
      if (row.bounce_rate != null) {
        acc.bounce += Number(row.bounce_rate);
        acc.bounceCount += 1;
      }
      if (row.avg_session_duration != null) {
        acc.duration += Number(row.avg_session_duration);
        acc.durationCount += 1;
      }
      return acc;
    },
    {
      sessions: 0,
      users: 0,
      pageviews: 0,
      conversions: 0,
      bounce: 0,
      bounceCount: 0,
      duration: 0,
      durationCount: 0,
    }
  );

  const topPagesMap = new Map<string, { sessions: number; users: number; pageviews: number; conversions: number }>();
  for (const row of rows) {
    const key = row.page_path ?? '/';
    const prev = topPagesMap.get(key) ?? { sessions: 0, users: 0, pageviews: 0, conversions: 0 };
    prev.sessions += row.sessions ?? 0;
    prev.users += row.users ?? 0;
    prev.pageviews += row.pageviews ?? 0;
    prev.conversions += row.conversions ?? 0;
    topPagesMap.set(key, prev);
  }

  const topPages = Array.from(topPagesMap.entries())
    .map(([pagePath, m]) => ({ pagePath, ...m }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  return {
    websiteId,
    from,
    to,
    sessions: totals.sessions,
    users: totals.users,
    pageviews: totals.pageviews,
    conversions: totals.conversions,
    avgBounceRate: totals.bounceCount ? totals.bounce / totals.bounceCount : null,
    avgSessionDuration: totals.durationCount ? totals.duration / totals.durationCount : null,
    trend: {
      sessions: 0,
      users: 0,
      pageviews: 0,
      conversions: 0,
    },
    topPages,
    integrationStatus: await getIntegrationStatus(websiteId),
  };
}

export async function getKeywords(websiteId: string): Promise<KeywordRowDTO[]> {
  const supabase = createSupabaseServiceRoleClient();

  const { data: keywordsData, error: keywordsError } = await supabase
    .from('seo_keywords')
    .select('id, keyword, locale, target_url')
    .eq('website_id', websiteId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (keywordsError) {
    throw new SeoApiError('INTERNAL_ERROR', 'Failed to load keywords', 500, keywordsError.message);
  }

  const keywords = keywordsData ?? [];
  if (!keywords.length) return [];

  // Fetch snapshots in batches of 100 to avoid URL length limits with large .in() clauses
  const keywordIds = keywords.map((k) => k.id);
  const BATCH_SIZE = 100;
  const allSnapshots: Array<{ keyword_id: string; snapshot_date: string; position: number | null; search_volume: number | null }> = [];

  for (let i = 0; i < keywordIds.length; i += BATCH_SIZE) {
    const batch = keywordIds.slice(i, i + BATCH_SIZE);
    const { data: batchData, error: snapshotsError } = await supabase
      .from('seo_keyword_snapshots')
      .select('keyword_id, snapshot_date, position, search_volume')
      .in('keyword_id', batch)
      .order('snapshot_date', { ascending: false });

    if (snapshotsError) {
      throw new SeoApiError('INTERNAL_ERROR', 'Failed to load keyword snapshots', 500, snapshotsError.message);
    }
    allSnapshots.push(...(batchData ?? []));
  }

  const snapshotsData = allSnapshots;

  const snapshotsByKeyword = new Map<string, Array<{ snapshot_date: string; position: number | null; search_volume: number | null }>>();
  for (const row of snapshotsData ?? []) {
    const list = snapshotsByKeyword.get(row.keyword_id) ?? [];
    list.push({
      snapshot_date: row.snapshot_date,
      position: row.position,
      search_volume: row.search_volume,
    });
    snapshotsByKeyword.set(row.keyword_id, list);
  }

  return keywords.map((row) => {
    const snapshots = snapshotsByKeyword.get(row.id) ?? [];
    const latest = snapshots[0];

    return {
      id: row.id,
      keyword: row.keyword,
      locale: row.locale,
      targetUrl: row.target_url,
      latestPosition: latest?.position ?? null,
      latestSearchVolume: latest?.search_volume ?? null,
      latestSnapshotDate: latest?.snapshot_date ?? null,
      snapshots: snapshots.slice(0, 30).map((s) => ({
        snapshotDate: s.snapshot_date,
        position: s.position,
        searchVolume: s.search_volume,
      })),
    };
  });
}

export async function getCompetitors(websiteId: string): Promise<CompetitorRowDTO[]> {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from('seo_competitors')
    .select('id, domain, snapshot_date, avg_position, traffic_share, source')
    .eq('website_id', websiteId)
    .order('snapshot_date', { ascending: false })
    .limit(200);

  if (error) {
    throw new SeoApiError('INTERNAL_ERROR', 'Failed to load competitors', 500, error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    domain: row.domain,
    snapshotDate: row.snapshot_date,
    avgPosition: row.avg_position,
    trafficShare: row.traffic_share,
    source: row.source,
  }));
}

export async function getHealth(websiteId: string): Promise<HealthAuditDTO[]> {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from('seo_audit_results')
    .select('id, page_url, page_type, audit_date, performance_score, lcp_ms, cls_score, issue_count_critical, issue_count_warning, issue_count_info')
    .eq('website_id', websiteId)
    .order('audit_date', { ascending: false })
    .limit(100);

  if (error) {
    throw new SeoApiError('INTERNAL_ERROR', 'Failed to load health audits', 500, error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    pageUrl: row.page_url,
    pageType: row.page_type,
    auditDate: row.audit_date,
    performanceScore: row.performance_score,
    lcpMs: row.lcp_ms,
    clsScore: row.cls_score,
    issueCountCritical: row.issue_count_critical ?? 0,
    issueCountWarning: row.issue_count_warning ?? 0,
    issueCountInfo: row.issue_count_info ?? 0,
  }));
}

export async function refreshIntegrationToken(websiteId: string, provider: 'gsc' | 'ga4') {
  const updated = await getFreshCredential(websiteId, provider);
  return {
    provider,
    tokenExpiry: updated.token_expiry,
    connected: !!updated.access_token,
  };
}

export async function getGoogleIntegrationOptions(
  websiteId: string,
  provider: 'gsc' | 'ga4'
): Promise<GoogleIntegrationOption[]> {
  const credential = await getFreshCredential(websiteId, provider);

  if (!credential.access_token) {
    throw new SeoApiError('INTEGRATION_NOT_CONNECTED', `${provider.toUpperCase()} is not connected`, 400);
  }

  if (provider === 'gsc') {
    const sites = await listSearchConsoleSites(credential.access_token);
    return sites
      .map((site) => ({
        value: site.siteUrl,
        label: site.siteUrl,
        meta: site.permissionLevel,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  const properties = await listGa4Properties(credential.access_token);
  return properties
    .map((property) => ({
      value: property.propertyId,
      label: `${property.displayName} (${property.propertyId})`,
      meta: property.accountDisplayName,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function configureGoogleIntegration(
  websiteId: string,
  provider: 'gsc' | 'ga4',
  args: { siteUrl?: string | null; propertyId?: string | null }
) {
  const current = (await getCredentialMap(websiteId)).get(provider);
  if (!current?.access_token) {
    throw new SeoApiError('INTEGRATION_NOT_CONNECTED', `${provider.toUpperCase()} is not connected`, 400);
  }

  if (provider === 'gsc' && !args.siteUrl) {
    throw new SeoApiError('VALIDATION_ERROR', 'siteUrl is required for GSC', 400);
  }
  if (provider === 'ga4' && !args.propertyId) {
    throw new SeoApiError('VALIDATION_ERROR', 'propertyId is required for GA4', 400);
  }

  await upsertCredential(websiteId, provider, {
    access_token: current.access_token,
    refresh_token: current.refresh_token,
    token_expiry: current.token_expiry,
    scopes: current.scopes ?? [],
    site_url: provider === 'gsc' ? args.siteUrl ?? null : current.site_url,
    property_id: provider === 'ga4' ? args.propertyId ?? null : current.property_id,
    last_error: null,
  });
}

export async function autoConfigureGoogleIntegration(
  websiteId: string,
  provider: 'gsc' | 'ga4'
): Promise<{ configured: boolean; selected?: string }> {
  const options = await getGoogleIntegrationOptions(websiteId, provider);
  if (options.length !== 1) {
    return { configured: false };
  }

  if (provider === 'gsc') {
    await configureGoogleIntegration(websiteId, provider, { siteUrl: options[0].value });
  } else {
    await configureGoogleIntegration(websiteId, provider, { propertyId: options[0].value });
  }

  return {
    configured: true,
    selected: options[0].value,
  };
}

export async function saveIntegrationCredentials(
  websiteId: string,
  provider: 'gsc' | 'ga4',
  args: {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    scope?: string;
    siteUrl?: string | null;
    propertyId?: string | null;
  }
) {
  const expiry = new Date(Date.now() + args.expiresIn * 1000).toISOString();

  const current = (await getCredentialMap(websiteId)).get(provider);
  await upsertCredential(websiteId, provider, {
    access_token: args.accessToken,
    refresh_token: args.refreshToken ?? current?.refresh_token ?? null,
    token_expiry: expiry,
    scopes: args.scope ? args.scope.split(' ') : current?.scopes ?? [],
    site_url: args.siteUrl ?? current?.site_url ?? null,
    property_id: args.propertyId ?? current?.property_id ?? null,
    last_error: null,
  });

  return {
    provider,
    tokenExpiry: expiry,
  };
}
