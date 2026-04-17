import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

const SERP_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DATAFORSEO_ENDPOINT = '/v3/serp/google/organic/live/advanced';
const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com';

export type SerpTopItem = {
  rank: number;
  url: string;
  title: string | null;
  wordCount: number | null;
  headings: string[];
  entities: string[];
};

export type SerpSnapshotResult = {
  keyword: string;
  locale: string;
  country: string;
  language: string;
  cacheHit: boolean;
  top10: SerpTopItem[];
  peopleAlsoAsk: string[];
  entities: string[];
  source: string;
  fetchedAt: string;
  confidence: 'live' | 'partial' | 'exploratory';
};

export class SerpSnapshotError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type DataForSeoCredentials = {
  login: string;
  password: string;
};

type DataForSeoRequestInput = {
  keyword: string;
  locale: string;
  country: string;
  language: string;
};

type GetSerpSnapshotInput = {
  websiteId: string;
  keyword: string;
  locale: string;
  country: string;
  language: string;
  forceRefresh?: boolean;
};

function nowIso(): string {
  return new Date().toISOString();
}

function canonicalKeyword(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

function countWords(input: string | null | undefined): number | null {
  if (!input) return null;
  const count = input
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Number.isFinite(count) && count > 0 ? count : null;
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
  }
  return output;
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object') {
        const obj = entry as Record<string, unknown>;
        if (typeof obj.name === 'string') return obj.name;
        if (typeof obj.entity === 'string') return obj.entity;
        if (typeof obj.title === 'string') return obj.title;
        if (typeof obj.keyword === 'string') return obj.keyword;
      }
      return '';
    })
    .filter(Boolean);
}

function normalizeCountryCode(country: string, locale: string): string {
  const byName: Record<string, string> = {
    'united states': 'US',
    usa: 'US',
    us: 'US',
    colombia: 'CO',
    mexico: 'MX',
    spain: 'ES',
    espana: 'ES',
  };

  const countryTrimmed = country.trim();
  if (/^[A-Za-z]{2}$/.test(countryTrimmed)) return countryTrimmed.toUpperCase();
  const mapped = byName[countryTrimmed.toLowerCase()];
  if (mapped) return mapped;

  const region = locale.split('-')[1];
  if (region && /^[A-Za-z]{2}$/.test(region)) return region.toUpperCase();

  return 'US';
}

function normalizeLanguageCode(language: string, locale: string): string {
  const lang = language.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(lang)) return lang;

  const byName: Record<string, string> = {
    english: 'en',
    spanish: 'es',
    portugues: 'pt',
    portuguese: 'pt',
    french: 'fr',
  };

  if (byName[lang]) return byName[lang];

  const localeLang = locale.split('-')[0]?.toLowerCase();
  if (localeLang && /^[a-z]{2}$/.test(localeLang)) return localeLang;

  return 'en';
}

function getDataForSeoCredentials(): DataForSeoCredentials {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  if (login && password) {
    return { login, password };
  }

  const legacy = process.env.DATAFORSEO_CREDENTIALS?.trim();
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) as { login?: string; password?: string };
      if (parsed.login?.trim() && parsed.password?.trim()) {
        return { login: parsed.login.trim(), password: parsed.password.trim() };
      }
    } catch {
      // ignore json parse error and try colon format
    }

    const idx = legacy.indexOf(':');
    if (idx > 0) {
      const legacyLogin = legacy.slice(0, idx).trim();
      const legacyPassword = legacy.slice(idx + 1).trim();
      if (legacyLogin && legacyPassword) {
        return { login: legacyLogin, password: legacyPassword };
      }
    }
  }

  throw new SerpSnapshotError(
    'INTEGRATION_NOT_CONNECTED',
    'DataForSEO credentials are not configured',
    503,
  );
}

function extractTaskItems(raw: unknown): Array<Record<string, unknown>> {
  if (!raw || typeof raw !== 'object') return [];
  const payload = raw as Record<string, unknown>;
  const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
  const firstTask = tasks[0] as Record<string, unknown> | undefined;
  const results = Array.isArray(firstTask?.result) ? firstTask.result : [];
  const firstResult = results[0] as Record<string, unknown> | undefined;
  const items = Array.isArray(firstResult?.items) ? firstResult.items : [];
  return items.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'));
}

function extractPaaQuestions(items: Array<Record<string, unknown>>): string[] {
  const questions: string[] = [];
  for (const item of items) {
    const type = String(item.type ?? item.item_type ?? '').toLowerCase();
    if (!type.includes('people_also_ask') && !type.includes('related_question') && !type.includes('people_also_search')) {
      continue;
    }

    const directQuestion = typeof item.question === 'string' ? item.question : null;
    if (directQuestion) questions.push(directQuestion);

    const nested = Array.isArray(item.items) ? item.items : [];
    for (const nestedItem of nested) {
      if (!nestedItem || typeof nestedItem !== 'object') continue;
      const nestedObj = nestedItem as Record<string, unknown>;
      if (typeof nestedObj.question === 'string') questions.push(nestedObj.question);
      if (typeof nestedObj.title === 'string') questions.push(nestedObj.title);
    }
  }
  return dedupeStrings(questions).slice(0, 20);
}

function extractEntityCandidates(item: Record<string, unknown>): string[] {
  const fromItem = [
    ...coerceStringArray(item.entities),
    ...coerceStringArray(item.entities_info),
    ...coerceStringArray(item.about_this_result),
    ...coerceStringArray(item.related_searches),
  ];

  if (fromItem.length > 0) return dedupeStrings(fromItem);

  const title = typeof item.title === 'string' ? item.title : '';
  const description = typeof item.description === 'string' ? item.description : '';
  const merged = `${title} ${description}`.trim();
  if (!merged) return [];

  const tokens = merged
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
    .slice(0, 12);

  return dedupeStrings(tokens);
}

function normalizeTop10(items: Array<Record<string, unknown>>): SerpTopItem[] {
  const organic = items
    .map((item) => {
      const type = String(item.type ?? item.item_type ?? '').toLowerCase();
      if (!type.includes('organic')) return null;

      const url = typeof item.url === 'string' ? item.url : null;
      if (!url) return null;

      const rankRaw = Number(item.rank_group ?? item.rank_absolute ?? item.rank ?? 0);
      const rank = Number.isFinite(rankRaw) && rankRaw > 0 ? Math.trunc(rankRaw) : 0;
      if (rank <= 0 || rank > 10) return null;

      const title = typeof item.title === 'string' ? item.title : null;
      const description = typeof item.description === 'string' ? item.description : null;

      const headingCandidates = [
        ...coerceStringArray(item.headings),
        ...coerceStringArray(item.h1),
        ...coerceStringArray(item.h2),
      ];

      const entities = extractEntityCandidates(item).slice(0, 12);

      return {
        rank,
        url,
        title,
        wordCount: countWords(description ?? title ?? ''),
        headings: dedupeStrings(headingCandidates).slice(0, 8),
        entities,
      } satisfies SerpTopItem;
    })
    .filter((entry): entry is SerpTopItem => Boolean(entry));

  return organic.sort((a, b) => a.rank - b.rank).slice(0, 10);
}

function normalizeSnapshot(raw: unknown, input: DataForSeoRequestInput) {
  const items = extractTaskItems(raw);
  const top10 = normalizeTop10(items);
  const peopleAlsoAsk = extractPaaQuestions(items);

  const entities = dedupeStrings([
    ...top10.flatMap((entry) => entry.entities),
    ...items.flatMap((entry) => coerceStringArray(entry.entities)),
  ]).slice(0, 80);

  return {
    keyword: canonicalKeyword(input.keyword),
    locale: input.locale,
    country: input.country,
    language: input.language,
    top10,
    peopleAlsoAsk,
    entities,
  };
}

function getMonthlyCapUsd(): number | null {
  const raw = process.env.DATAFORSEO_MONTHLY_CAP_USD ?? process.env.SEO_PROVIDER_MONTHLY_CAP_USD;
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function getSerpCallCostUsd(): number {
  const raw = process.env.DATAFORSEO_SERP_COST_USD;
  const parsed = Number(raw ?? '0.05');
  if (!Number.isFinite(parsed) || parsed < 0) return 0.05;
  return parsed;
}

function billingMonthIsoDate(now: Date): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

async function enforceProviderCapOrThrow(input: {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  websiteId: string;
  provider: string;
  endpoint: string;
  estimatedCostUsd: number;
}) {
  const monthlyCapUsd = getMonthlyCapUsd();
  if (monthlyCapUsd === null) return;

  const billingMonth = billingMonthIsoDate(new Date());

  const { data, error } = await input.admin
    .from('seo_provider_usage')
    .select('request_count,total_cost_usd')
    .eq('website_id', input.websiteId)
    .eq('provider', input.provider)
    .eq('endpoint', input.endpoint)
    .eq('billing_month', billingMonth)
    .maybeSingle();

  if (error) {
    throw new SerpSnapshotError('INTERNAL_ERROR', 'Unable to read provider usage', 500, error.message);
  }

  const currentCost = Number(data?.total_cost_usd ?? 0);
  if (currentCost + input.estimatedCostUsd > monthlyCapUsd) {
    throw new SerpSnapshotError(
      'PROVIDER_CAP_REACHED',
      'DataForSEO monthly budget cap reached',
      429,
      {
        provider: input.provider,
        endpoint: input.endpoint,
        monthlyCapUsd,
        currentCostUsd: currentCost,
        estimatedCostUsd: input.estimatedCostUsd,
      },
    );
  }
}

async function recordProviderUsage(input: {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  websiteId: string;
  provider: string;
  endpoint: string;
  keyword: string;
  locale: string;
  costUsd: number;
}) {
  const now = new Date();
  const nowIsoString = now.toISOString();
  const billingMonth = billingMonthIsoDate(now);

  const { data: current, error: currentError } = await input.admin
    .from('seo_provider_usage')
    .select('id,request_count,total_cost_usd,metadata,first_called_at')
    .eq('website_id', input.websiteId)
    .eq('provider', input.provider)
    .eq('endpoint', input.endpoint)
    .eq('billing_month', billingMonth)
    .maybeSingle();

  if (currentError) {
    throw new SerpSnapshotError('INTERNAL_ERROR', 'Unable to load provider usage row', 500, currentError.message);
  }

  if (!current) {
    const { error: insertError } = await input.admin
      .from('seo_provider_usage')
      .insert({
        website_id: input.websiteId,
        provider: input.provider,
        endpoint: input.endpoint,
        billing_month: billingMonth,
        request_count: 1,
        total_cost_usd: input.costUsd,
        metadata: {
          lastKeyword: input.keyword,
          locale: input.locale,
        },
        first_called_at: nowIsoString,
        last_called_at: nowIsoString,
      });

    if (insertError) {
      throw new SerpSnapshotError('INTERNAL_ERROR', 'Unable to insert provider usage row', 500, insertError.message);
    }

    return;
  }

  const { error: updateError } = await input.admin
    .from('seo_provider_usage')
    .update({
      request_count: Number(current.request_count ?? 0) + 1,
      total_cost_usd: Number(current.total_cost_usd ?? 0) + input.costUsd,
      metadata: {
        ...(current.metadata && typeof current.metadata === 'object' ? current.metadata : {}),
        lastKeyword: input.keyword,
        locale: input.locale,
      },
      first_called_at: current.first_called_at ?? nowIsoString,
      last_called_at: nowIsoString,
      updated_at: nowIsoString,
    })
    .eq('id', current.id);

  if (updateError) {
    throw new SerpSnapshotError('INTERNAL_ERROR', 'Unable to update provider usage row', 500, updateError.message);
  }
}

async function callDataForSeo(input: DataForSeoRequestInput) {
  const credentials = getDataForSeoCredentials();
  const countryCode = normalizeCountryCode(input.country, input.locale);
  const languageCode = normalizeLanguageCode(input.language, input.locale);

  const requestBody = [
    {
      keyword: input.keyword,
      location_name: countryCode,
      language_code: languageCode,
      depth: 10,
      device: 'desktop',
      os: 'windows',
    },
  ];

  const authHeader = Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64');
  const response = await fetch(`${DATAFORSEO_BASE_URL}${DATAFORSEO_ENDPOINT}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new SerpSnapshotError(
      'UPSTREAM_ERROR',
      'DataForSEO request failed',
      502,
      {
        status: response.status,
        body,
      },
    );
  }

  return body;
}

function mapDbRowToSnapshot(row: Record<string, unknown>): SerpSnapshotResult {
  return {
    keyword: String(row.keyword ?? ''),
    locale: String(row.locale ?? ''),
    country: String(row.country ?? ''),
    language: String(row.language ?? ''),
    cacheHit: true,
    top10: Array.isArray(row.top10) ? (row.top10 as SerpTopItem[]) : [],
    peopleAlsoAsk: Array.isArray(row.people_also_ask)
      ? (row.people_also_ask as unknown[]).map((entry) => String(entry)).filter(Boolean)
      : [],
    entities: Array.isArray(row.entities)
      ? (row.entities as unknown[]).map((entry) => String(entry)).filter(Boolean)
      : [],
    source: String(row.source ?? 'seo_market_serp_snapshots'),
    fetchedAt: String(row.fetched_at ?? nowIso()),
    confidence: (row.confidence as SerpSnapshotResult['confidence']) ?? 'partial',
  };
}

function isFresh(fetchedAtRaw: unknown): boolean {
  if (typeof fetchedAtRaw !== 'string') return false;
  const fetchedAt = new Date(fetchedAtRaw).getTime();
  if (Number.isNaN(fetchedAt)) return false;
  return Date.now() - fetchedAt <= SERP_CACHE_TTL_MS;
}

export async function getOrCreateSerpSnapshot(input: GetSerpSnapshotInput): Promise<SerpSnapshotResult> {
  const admin = createSupabaseServiceRoleClient();
  const keyword = canonicalKeyword(input.keyword);

  const { data: cachedRow, error: cacheError } = await admin
    .from('seo_market_serp_snapshots')
    .select('keyword,locale,country,language,top10,entities,people_also_ask,source,fetched_at,confidence,updated_at')
    .eq('website_id', input.websiteId)
    .eq('keyword', keyword)
    .eq('locale', input.locale)
    .maybeSingle();

  if (cacheError) {
    throw new SerpSnapshotError('INTERNAL_ERROR', 'Unable to read SERP snapshot cache', 500, cacheError.message);
  }

  if (cachedRow && !input.forceRefresh && isFresh(cachedRow.fetched_at)) {
    return mapDbRowToSnapshot(cachedRow as Record<string, unknown>);
  }

  const estimatedCostUsd = getSerpCallCostUsd();
  await enforceProviderCapOrThrow({
    admin,
    websiteId: input.websiteId,
    provider: 'dataforseo',
    endpoint: DATAFORSEO_ENDPOINT,
    estimatedCostUsd,
  });

  const upstream = await callDataForSeo({
    keyword,
    locale: input.locale,
    country: input.country,
    language: input.language,
  });

  const normalized = normalizeSnapshot(upstream, {
    keyword,
    locale: input.locale,
    country: input.country,
    language: input.language,
  });

  const fetchedAt = nowIso();
  const upsertPayload = {
    website_id: input.websiteId,
    keyword,
    locale: input.locale,
    country: input.country,
    language: input.language,
    top10: normalized.top10,
    entities: normalized.entities,
    people_also_ask: normalized.peopleAlsoAsk,
    source: 'dataforseo',
    fetched_at: fetchedAt,
    confidence: 'live' as const,
    updated_at: fetchedAt,
  };

  const { error: upsertError } = await admin
    .from('seo_market_serp_snapshots')
    .upsert(upsertPayload, { onConflict: 'website_id,keyword,locale' });

  if (upsertError) {
    throw new SerpSnapshotError('INTERNAL_ERROR', 'Unable to persist SERP snapshot', 500, upsertError.message);
  }

  await recordProviderUsage({
    admin,
    websiteId: input.websiteId,
    provider: 'dataforseo',
    endpoint: DATAFORSEO_ENDPOINT,
    keyword,
    locale: input.locale,
    costUsd: estimatedCostUsd,
  });

  return {
    keyword,
    locale: input.locale,
    country: input.country,
    language: input.language,
    cacheHit: false,
    top10: normalized.top10,
    peopleAlsoAsk: normalized.peopleAlsoAsk,
    entities: normalized.entities,
    source: 'dataforseo',
    fetchedAt,
    confidence: 'live',
  };
}
