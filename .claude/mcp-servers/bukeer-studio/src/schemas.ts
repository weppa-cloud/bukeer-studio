/**
 * Zod schemas for every MCP tool. Mirrors shapes defined in
 * `packages/website-contract/src/schemas/seo-content-intelligence.ts` and the
 * inline schemas in each route handler. Kept inline (not imported) because
 * the MCP server is a standalone Node package built independently.
 */
import { z } from 'zod';

// ── Shared enums ─────────────────────────────────────────────────────────────

export const SeoConfidence = z.enum(['live', 'partial', 'exploratory']);
export const SeoContentType = z.enum([
  'blog',
  'destination',
  'package',
  'activity',
  'page',
  'landing',
]);
export const SeoPageType = z.enum([
  'blog',
  'destination',
  'package',
  'activity',
  'page',
  'hotel',
  'transfer',
]);
export const SeoItemType = z.enum([
  'blog',
  'destination',
  'package',
  'activity',
  'page',
  'hotel',
  'transfer',
]);
export const SeoIntent = z.enum([
  'informational',
  'navigational',
  'commercial',
  'transactional',
  'mixed',
]);

// ── SEO audit ────────────────────────────────────────────────────────────────

export const SeoAuditRunSchema = z.object({
  websiteId: z.string().uuid(),
  locale: z.string().min(2).max(16),
  contentTypes: z.array(SeoContentType).default([]),
});

export const SeoAuditQuerySchema = z.object({
  websiteId: z.string().uuid(),
  locale: z.string().min(2).max(16).optional(),
  contentType: SeoContentType.optional(),
  decisionGradeOnly: z.boolean().default(true),
  limit: z.number().int().min(1).max(200).default(50),
});

// ── SEO research ─────────────────────────────────────────────────────────────

export const SeoResearchSchema = z.object({
  websiteId: z.string().uuid(),
  contentType: SeoContentType,
  country: z.string().min(2).max(64),
  language: z.string().min(2).max(16),
  locale: z.string().min(2).max(16),
  seeds: z.array(z.string().min(2).max(120)).min(1).max(30),
  decisionGradeOnly: z.boolean().default(true),
});

// ── SEO clusters ─────────────────────────────────────────────────────────────

export const SeoClustersListSchema = z.object({
  websiteId: z.string().uuid(),
  locale: z.string().min(2).max(16).optional(),
  contentType: SeoContentType.optional(),
});

export const SeoClustersCreateSchema = z.object({
  websiteId: z.string().uuid(),
  locale: z.string().min(2).max(16),
  contentType: SeoContentType,
  name: z.string().min(2).max(140),
  primaryTopic: z.string().min(2).max(200),
  targetCountry: z.string().min(2).max(64),
  targetLanguage: z.string().min(2).max(16),
});

export const SeoClustersAssignSchema = z
  .object({
    assignType: z.enum(['keyword', 'page']).describe(
      "'keyword' = assign a keyword to the cluster. 'page' = assign a page to the cluster.",
    ),
    websiteId: z.string().uuid(),
    clusterId: z.string().uuid(),
    // keyword branch
    keyword: z.string().min(2).max(120).optional(),
    intent: SeoIntent.optional(),
    // page branch
    pageType: SeoPageType.optional(),
    pageId: z.string().uuid().optional(),
    role: z.enum(['hub', 'spoke', 'support']).optional(),
    targetKeyword: z.string().max(120).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.assignType === 'keyword' && !v.keyword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'keyword is required when assignType="keyword"' });
    }
    if (v.assignType === 'page' && (!v.pageType || !v.pageId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'pageType and pageId are required when assignType="page"' });
    }
  });

// ── SEO optimize ─────────────────────────────────────────────────────────────

export const SeoOptimizeSchema = z.object({
  websiteId: z.string().uuid(),
  itemType: SeoItemType,
  itemId: z.string().uuid(),
  locale: z.string().min(2).max(16),
  mode: z.enum(['suggest', 'apply']),
  briefId: z.string().uuid().optional(),
  patch: z.record(z.string(), z.unknown()).default({}),
});

// ── SEO transcreate ──────────────────────────────────────────────────────────

export const SeoTranscreateSchema = z.object({
  action: z.enum(['create_draft', 'review', 'apply']),
  websiteId: z.string().uuid(),
  sourceContentId: z.string().uuid(),
  targetContentId: z.string().uuid().optional(),
  pageType: SeoPageType,
  sourceLocale: z.string().min(2).max(16),
  targetLocale: z.string().min(2).max(16),
  country: z.string().min(2).max(64),
  language: z.string().min(2).max(16),
  sourceKeyword: z.string().max(120).optional(),
  targetKeyword: z.string().max(120).optional(),
  draft: z.record(z.string(), z.unknown()).default({}),
  jobId: z.string().uuid().optional(),
});

// ── SEO score ────────────────────────────────────────────────────────────────

export const SeoScoreSchema = z.object({
  websiteId: z.string().uuid(),
  itemType: z.enum(['hotel', 'activity', 'transfer', 'package', 'destination', 'blog', 'page']),
  itemId: z.string().uuid(),
  locale: z.string().default('es-CO'),
});

// ── Striking distance ────────────────────────────────────────────────────────

export const SeoStrikingDistanceSchema = z.object({
  websiteId: z.string().uuid(),
});

// ── SEO health ───────────────────────────────────────────────────────────────

export const SeoHealthSchema = z.object({
  websiteId: z.string().uuid(),
});

// ── SEO sync ─────────────────────────────────────────────────────────────────

export const SeoSyncSchema = z.object({
  websiteId: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
  includeDataForSeo: z.boolean().default(false),
});

// ── Integrations status ──────────────────────────────────────────────────────

export const SeoIntegrationsStatusSchema = z.object({
  websiteId: z.string().uuid(),
});

// ── AI generate blog ─────────────────────────────────────────────────────────

export const AiGenerateBlogSchema = z.object({
  topic: z.string().min(3).max(2000),
  locale: z.string().default('es'),
  tone: z.string().default('professional'),
  websiteContext: z.record(z.string(), z.unknown()).optional(),
  productLinks: z
    .array(z.object({ slug: z.string(), title: z.string() }))
    .optional(),
  version: z.union([z.literal(1), z.literal(2)]).default(1),
  clusterContext: z.string().optional(),
  targetWordCount: z.number().int().min(400).max(5000).optional(),
});

// ── Supabase direct helpers ──────────────────────────────────────────────────

export const GetWebsiteSchema = z
  .object({
    bySubdomain: z.string().min(1).optional(),
    byId: z.string().uuid().optional(),
  })
  .refine((v) => Boolean(v.bySubdomain) !== Boolean(v.byId), {
    message: 'Provide exactly one of bySubdomain or byId.',
  });

export const ListWebsitesByAccountSchema = z.object({
  accountId: z.string().uuid(),
});

export const BlogPostUpsertSchema = z.object({
  websiteId: z.string().uuid(),
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  excerpt: z.string().max(400).optional(),
  cover: z.string().url().optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(300).optional(),
  faqs: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  locale: z.string().min(2).max(16).optional(),
  translationGroupId: z.string().uuid().optional(),
});
