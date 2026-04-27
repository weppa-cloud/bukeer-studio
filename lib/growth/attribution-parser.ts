import {
  GrowthAttributionInputSchema,
  type GrowthAttribution,
  type GrowthAttributionInput,
  type GrowthChannel,
  type GrowthClickIds,
  type GrowthUtm,
} from '@bukeer/website-contract';

/**
 * Attribution parser — SPEC #337
 *
 * Extracts UTM params and click identifiers (gclid, gbraid, wbraid, fbclid,
 * ttclid) from a URL. Pure function — no cookie/storage side effects.
 * Persistence (cookie, localStorage, server-side session) is the caller's
 * responsibility per ADR-005 (consent + privacy ownership lives in #336).
 */

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid'] as const;

function readParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key);
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 200) : null;
}

export function parseUtm(input: URL | URLSearchParams | string): GrowthUtm {
  const params = toSearchParams(input);
  return UTM_KEYS.reduce<GrowthUtm>(
    (acc, key) => {
      acc[key] = readParam(params, key);
      return acc;
    },
    { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null },
  );
}

export function parseClickIds(input: URL | URLSearchParams | string): GrowthClickIds {
  const params = toSearchParams(input);
  return CLICK_ID_KEYS.reduce<GrowthClickIds>(
    (acc, key) => {
      acc[key] = readParam(params, key);
      return acc;
    },
    { gclid: null, gbraid: null, wbraid: null, fbclid: null, ttclid: null },
  );
}

export function inferChannel(utm: GrowthUtm, clickIds: GrowthClickIds, referrer: string | null): GrowthChannel {
  if (clickIds.gclid || clickIds.gbraid || clickIds.wbraid) return 'google_ads';
  if (clickIds.fbclid) return 'meta';
  if (clickIds.ttclid) return 'tiktok';

  const source = (utm.utm_source ?? '').toLowerCase();
  const medium = (utm.utm_medium ?? '').toLowerCase();

  if (medium === 'cpc' || medium === 'paid' || medium === 'paidsearch') {
    if (source.includes('google')) return 'google_ads';
    if (source.includes('facebook') || source.includes('meta')) return 'meta';
    if (source.includes('tiktok')) return 'tiktok';
  }
  if (source === 'whatsapp' || medium === 'whatsapp') return 'whatsapp';
  if (source === 'waflow' || medium === 'waflow') return 'waflow';
  if (source === 'chatwoot' || medium === 'chat') return 'chatwoot';
  if (medium === 'organic' || medium === 'seo') return 'seo';
  if (medium === 'email' || source === 'email') return 'email';
  if (medium === 'referral') return 'referral';

  if (!referrer || referrer.length === 0) return 'direct';
  try {
    const refHost = new URL(referrer).hostname.toLowerCase();
    if (refHost.includes('google.')) return 'seo';
    if (refHost.includes('facebook.') || refHost.includes('instagram.')) return 'meta';
    if (refHost.includes('tiktok.')) return 'tiktok';
    if (refHost.includes('wa.me') || refHost.includes('whatsapp.')) return 'whatsapp';
    return 'referral';
  } catch {
    return 'unknown';
  }
}

export interface ParseAttributionInput {
  url: URL | string;
  referrer?: string | null;
  account_id: string;
  website_id: string;
  locale: string;
  market: GrowthAttribution['market'];
  reference_code: string;
  session_key: string;
  capturedAt?: Date;
}

export function parseAttribution(input: ParseAttributionInput): GrowthAttributionInput {
  const url = typeof input.url === 'string' ? new URL(input.url) : input.url;
  const utm = parseUtm(url);
  const clickIds = parseClickIds(url);
  const channel = inferChannel(utm, clickIds, input.referrer ?? null);
  const captured = input.capturedAt ?? new Date();

  const candidate: GrowthAttributionInput = {
    account_id: input.account_id,
    website_id: input.website_id,
    locale: input.locale,
    market: input.market,
    reference_code: input.reference_code,
    session_key: input.session_key,
    source_url: url.toString().slice(0, 2048),
    page_path: url.pathname.slice(0, 2048) || '/',
    channel,
    utm,
    click_ids: clickIds,
    captured_at: captured.toISOString(),
  };

  return GrowthAttributionInputSchema.parse(candidate);
}

function toSearchParams(input: URL | URLSearchParams | string): URLSearchParams {
  if (input instanceof URLSearchParams) return input;
  if (input instanceof URL) return input.searchParams;
  const idx = input.indexOf('?');
  return new URLSearchParams(idx === -1 ? input : input.slice(idx + 1));
}
