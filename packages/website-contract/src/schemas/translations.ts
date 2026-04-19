import { z } from 'zod';

const LocaleSchema = z.string().min(2).max(16);
const PageTypeSchema = z.enum(['blog', 'page', 'destination', 'hotel', 'activity', 'package', 'transfer']);
export const TranscreatePayloadFieldSchema = z.enum([
  'meta_title',
  'meta_desc',
  'slug',
  'h1',
  'keywords',
  'body_content',
  'description_long',
  'highlights',
  'faq',
  'recommendations',
  'cta_final_text',
  'program_timeline',
  'inclusions',
  'exclusions',
  'hero_subtitle',
  'category_label',
]);

export const TranslationsListQuerySchema = z.object({
  websiteId: z.string().uuid(),
  sourceLocale: LocaleSchema.optional(),
  targetLocale: LocaleSchema.optional(),
  pageType: PageTypeSchema.optional(),
  status: z.enum(['draft', 'reviewed', 'applied', 'published']).optional(),
  search: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(250).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const TranslationJobItemSchema = z.object({
  id: z.string().uuid(),
  websiteId: z.string().uuid(),
  pageType: PageTypeSchema,
  pageId: z.string().uuid().nullable(),
  sourceLocale: LocaleSchema,
  targetLocale: LocaleSchema,
  status: z.enum(['draft', 'reviewed', 'applied', 'published']),
  sourceKeyword: z.string().nullable(),
  targetKeyword: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TranslationsListResponseSchema = z.object({
  websiteId: z.string().uuid(),
  total: z.number().int().nonnegative(),
  rows: z.array(TranslationJobItemSchema),
});

export const TranslationsBulkRequestSchema = z.object({
  websiteId: z.string().uuid(),
  jobIds: z.array(z.string().uuid()).min(1).max(250),
  action: z.enum(['review', 'apply']),
  fields: z.array(TranscreatePayloadFieldSchema).min(1).max(16).optional(),
});

export const TranslationsBulkResponseSchema = z.object({
  websiteId: z.string().uuid(),
  action: z.enum(['review', 'apply']),
  processed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  rows: z.array(
    z.object({
      jobId: z.string().uuid(),
      success: z.boolean(),
      status: z.enum(['reviewed', 'applied']).nullable(),
      error: z.string().nullable(),
    }),
  ),
});

export const GlossaryItemSchema = z.object({
  id: z.string().uuid(),
  websiteId: z.string().uuid(),
  locale: LocaleSchema,
  term: z.string().min(1),
  translation: z.string().min(1),
  notes: z.string().nullable().optional(),
});

export const TranslationMemoryItemSchema = z.object({
  id: z.string().uuid(),
  websiteId: z.string().uuid(),
  sourceLocale: LocaleSchema,
  targetLocale: LocaleSchema,
  pageType: PageTypeSchema,
  sourceText: z.string().min(1),
  targetText: z.string().min(1),
  similarityScore: z.number().min(0).max(1).nullable().optional(),
});

export const HreflangQuerySchema = z.object({
  websiteId: z.string().uuid(),
  path: z.string().min(1),
  locale: LocaleSchema.optional(),
});

export const SerpSnapshotRequestSchema = z.object({
  websiteId: z.string().uuid(),
  keyword: z.string().min(2).max(120),
  locale: LocaleSchema,
  country: z.string().min(2).max(64),
  language: z.string().min(2).max(16),
  forceRefresh: z.coerce.boolean().default(false),
});

export const SerpSnapshotResponseSchema = z.object({
  keyword: z.string(),
  locale: LocaleSchema,
  country: z.string(),
  language: z.string(),
  cacheHit: z.boolean(),
  top10: z.array(
    z.object({
      rank: z.number().int().positive(),
      url: z.string().url(),
      title: z.string().nullable().optional(),
      wordCount: z.number().int().nonnegative().nullable().optional(),
      headings: z.array(z.string()).default([]),
      entities: z.array(z.string()).default([]),
    }),
  ),
  peopleAlsoAsk: z.array(z.string()).default([]),
  entities: z.array(z.string()).default([]),
  source: z.string(),
  fetchedAt: z.string().datetime(),
});

export const NlpScoreRequestSchema = z.object({
  websiteId: z.string().uuid(),
  locale: LocaleSchema,
  keyword: z.string().min(2).max(120),
  content: z.string().min(50),
  pageType: PageTypeSchema,
});

export const NlpScoreResponseSchema = z.object({
  entityCoverage: z.object({
    matched: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    pct: z.number().min(0).max(100),
    missing: z.array(z.string()),
  }),
  wordCountVs: z.object({
    current: z.number().int().nonnegative(),
    top10Avg: z.number().int().nonnegative(),
    delta: z.number().int(),
  }),
  keywordDensity: z.object({
    keyword: z.string(),
    occurrences: z.number().int().nonnegative(),
    pct: z.number().min(0),
  }),
  readabilityScore: z.number().min(0).max(100),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
});

export const CannibalizationQuerySchema = z.object({
  websiteId: z.string().uuid(),
  locale: LocaleSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const HreflangAuditRequestSchema = z.object({
  websiteId: z.string().uuid(),
  locale: LocaleSchema.optional(),
  sampleSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const HreflangAuditResponseSchema = z.object({
  websiteId: z.string().uuid(),
  checked: z.number().int().nonnegative(),
  findings: z.array(
    z.object({
      url: z.string().url(),
      issue: z.string(),
      severity: z.enum(['critical', 'warning', 'info']),
    }),
  ),
});

export const DriftCheckQuerySchema = z.object({
  websiteId: z.string().uuid(),
  locale: LocaleSchema.optional(),
  pageType: PageTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const TopicalAuthorityQuerySchema = z.object({
  websiteId: z.string().uuid(),
  locale: LocaleSchema,
});

export const InternalLinksSuggestRequestSchema = z.object({
  websiteId: z.string().uuid(),
  locale: LocaleSchema,
  pageType: PageTypeSchema,
  pageId: z.string().uuid(),
  content: z.string().min(30),
});

export const QaAutofixRequestSchema = z.object({
  websiteId: z.string().uuid(),
  locale: LocaleSchema,
  pageType: PageTypeSchema,
  pageId: z.string().uuid(),
  findingIds: z.array(z.string().uuid()).min(1),
});

export const OkrSchema = z.object({
  id: z.string().uuid(),
  websiteId: z.string().uuid(),
  period: z.enum(['7d', '30d', '90d']),
  kpiKey: z.string().min(1),
  target: z.number(),
  currentValue: z.number().nullable().optional(),
  currentSource: z.string().nullable().optional(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const WeeklyTaskSchema = z.object({
  id: z.string().uuid(),
  websiteId: z.string().uuid(),
  weekOf: z.string().date(),
  taskType: z.enum(['striking_distance', 'low_ctr', 'drift', 'cannibalization', 'custom']),
  priority: z.enum(['P1', 'P2', 'P3']),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  sourceData: z.record(z.string(), z.unknown()).default({}),
  relatedEntityType: z.string().nullable().optional(),
  relatedEntityId: z.string().uuid().nullable().optional(),
  assigneeUserId: z.string().uuid().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'skipped']),
  dueAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const Objective90dSchema = z.object({
  id: z.string().uuid(),
  websiteId: z.string().uuid(),
  quarter: z.string().min(2).max(16),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  kpis: z.array(z.record(z.string(), z.unknown())).default([]),
  status: z.enum(['active', 'completed', 'paused']),
  startsOn: z.string().date().nullable().optional(),
  endsOn: z.string().date().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TranslationsListQuery = z.infer<typeof TranslationsListQuerySchema>;
export type TranslationJobItem = z.infer<typeof TranslationJobItemSchema>;
export type TranslationsListResponse = z.infer<typeof TranslationsListResponseSchema>;
export type TranslationsBulkRequest = z.infer<typeof TranslationsBulkRequestSchema>;
export type TranslationsBulkResponse = z.infer<typeof TranslationsBulkResponseSchema>;
export type TranscreatePayloadField = z.infer<typeof TranscreatePayloadFieldSchema>;
export type GlossaryItem = z.infer<typeof GlossaryItemSchema>;
export type TranslationMemoryItem = z.infer<typeof TranslationMemoryItemSchema>;
export type HreflangQuery = z.infer<typeof HreflangQuerySchema>;
export type SerpSnapshotRequest = z.infer<typeof SerpSnapshotRequestSchema>;
export type SerpSnapshotResponse = z.infer<typeof SerpSnapshotResponseSchema>;
export type NlpScoreRequest = z.infer<typeof NlpScoreRequestSchema>;
export type NlpScoreResponse = z.infer<typeof NlpScoreResponseSchema>;
export type CannibalizationQuery = z.infer<typeof CannibalizationQuerySchema>;
export type HreflangAuditRequest = z.infer<typeof HreflangAuditRequestSchema>;
export type HreflangAuditResponse = z.infer<typeof HreflangAuditResponseSchema>;
export type DriftCheckQuery = z.infer<typeof DriftCheckQuerySchema>;
export type TopicalAuthorityQuery = z.infer<typeof TopicalAuthorityQuerySchema>;
export type InternalLinksSuggestRequest = z.infer<typeof InternalLinksSuggestRequestSchema>;
export type QaAutofixRequest = z.infer<typeof QaAutofixRequestSchema>;
export type Okr = z.infer<typeof OkrSchema>;
export type WeeklyTask = z.infer<typeof WeeklyTaskSchema>;
export type Objective90d = z.infer<typeof Objective90dSchema>;
