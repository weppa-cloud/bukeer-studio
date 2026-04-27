import { z } from 'zod';

/**
 * Growth Attribution Contract — SPEC #337
 *
 * Attribution keys captured from URL params, cookies, and click identifiers.
 * Multi-tenant scoped via account_id + website_id (ADR-009).
 * event_id contract (ADR-018): sha256(reference_code:event_name:occurred_at_ms)
 *   shared between browser pixel and server CAPI/Events API.
 */

export const GrowthChannelSchema = z.enum([
  'seo',
  'google_ads',
  'meta',
  'tiktok',
  'whatsapp',
  'waflow',
  'chatwoot',
  'direct',
  'referral',
  'email',
  'unknown',
]);
export type GrowthChannel = z.infer<typeof GrowthChannelSchema>;

export const GrowthMarketSchema = z.enum(['CO', 'MX', 'US', 'CA', 'EU', 'OTHER']);
export type GrowthMarket = z.infer<typeof GrowthMarketSchema>;

export const GrowthLocaleSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/);
export type GrowthLocale = z.infer<typeof GrowthLocaleSchema>;

export const GrowthTenantScopeSchema = z.object({
  account_id: z.string().uuid(),
  website_id: z.string().uuid(),
  locale: GrowthLocaleSchema,
  market: GrowthMarketSchema,
});
export type GrowthTenantScope = z.infer<typeof GrowthTenantScopeSchema>;

export const GrowthUtmSchema = z.object({
  utm_source: z.string().min(1).max(120).nullable().default(null),
  utm_medium: z.string().min(1).max(120).nullable().default(null),
  utm_campaign: z.string().min(1).max(200).nullable().default(null),
  utm_content: z.string().min(1).max(200).nullable().default(null),
  utm_term: z.string().min(1).max(200).nullable().default(null),
});
export type GrowthUtm = z.infer<typeof GrowthUtmSchema>;

export const GrowthClickIdsSchema = z.object({
  gclid: z.string().min(1).max(200).nullable().default(null),
  gbraid: z.string().min(1).max(200).nullable().default(null),
  wbraid: z.string().min(1).max(200).nullable().default(null),
  fbclid: z.string().min(1).max(200).nullable().default(null),
  ttclid: z.string().min(1).max(200).nullable().default(null),
});
export type GrowthClickIds = z.infer<typeof GrowthClickIdsSchema>;

export const GrowthAttributionSchema = GrowthTenantScopeSchema.extend({
  reference_code: z.string().min(8).max(64),
  session_key: z.string().min(8).max(120),
  source_url: z.string().url().max(2048).nullable().default(null),
  page_path: z.string().min(1).max(2048),
  channel: GrowthChannelSchema.default('unknown'),
  utm: GrowthUtmSchema,
  click_ids: GrowthClickIdsSchema,
  captured_at: z.string().datetime(),
});
export type GrowthAttribution = z.infer<typeof GrowthAttributionSchema>;

export const GrowthAttributionInputSchema = GrowthAttributionSchema.partial({
  utm: true,
  click_ids: true,
  channel: true,
}).extend({
  utm: GrowthUtmSchema.partial().optional(),
  click_ids: GrowthClickIdsSchema.partial().optional(),
});
export type GrowthAttributionInput = z.infer<typeof GrowthAttributionInputSchema>;
