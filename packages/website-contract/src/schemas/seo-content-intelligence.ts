import { z } from 'zod';

export const SeoConfidenceSchema = z.enum(['live', 'partial', 'exploratory']);
export const SeoSeveritySchema = z.enum(['critical', 'warning', 'info']);
export const SeoContentTypeSchema = z.enum(['blog', 'destination', 'package', 'activity', 'page', 'landing']);
export const SeoItemTypeSchema = z.enum(['blog', 'destination', 'package', 'activity', 'page', 'hotel', 'transfer']);
export const SeoPageTypeSchema = z.enum(['blog', 'destination', 'package', 'activity', 'page', 'hotel', 'transfer']);

export const SeoSourceMetadataSchema = z.object({
  source: z.string().min(1),
  fetchedAt: z.string().datetime(),
  confidence: SeoConfidenceSchema,
});

export const SeoAuditRequestSchema = z.object({
  websiteId: z.string().uuid(),
  locale: z.string().min(2).max(16),
  contentTypes: z.array(SeoContentTypeSchema).default([]),
});

export const SeoAuditQuerySchema = z.object({
  websiteId: z.string().uuid(),
  locale: z.string().min(2).max(16).optional(),
  contentType: SeoContentTypeSchema.optional(),
  decisionGradeOnly: z.coerce.boolean().default(true),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const SeoAuditFindingSchema = SeoSourceMetadataSchema.extend({
  id: z.string().uuid(),
  snapshotId: z.string().uuid(),
  locale: z.string().min(2),
  pageType: SeoPageTypeSchema,
  pageId: z.string().uuid().nullable(),
  publicUrl: z.string().min(1),
  findingType: z.string().min(1),
  severity: SeoSeveritySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  evidence: z.record(z.string(), z.unknown()).default({}),
  decaySignal: z.enum(['none', 'low', 'medium', 'high']).default('none'),
  clicks90dCurrent: z.number().int().nonnegative().default(0),
  clicks90dPrevious: z.number().int().nonnegative().default(0),
  decayDeltaPct: z.number().default(0),
  cannibalizationGroupId: z.string().uuid().nullable(),
  cannibalizationRecommendedAction: z.enum(['merge', 'redirect', 'differentiate_intent', 'none']).default('none'),
  priorityScore: z.number().nonnegative().default(0),
  capturedAt: z.string().datetime(),
});

export const SeoResearchRequestSchema = z.object({
  websiteId: z.string().uuid(),
  contentType: SeoContentTypeSchema,
  country: z.string().min(2).max(64),
  language: z.string().min(2).max(16),
  locale: z.string().min(2).max(16),
  seeds: z.array(z.string().min(2).max(120)).min(1).max(30),
  decisionGradeOnly: z.coerce.boolean().default(true),
});

export const SeoSerpCompetitorSchema = z.object({
  url: z.string().url(),
  rank: z.number().int().positive(),
  wordCount: z.number().int().nonnegative(),
  headings: z.array(z.string()).default([]),
  schemaTypes: z.array(z.string()).default([]),
  contentFreshness: z.string().default('unknown'),
});

export const SeoKeywordCandidateSchema = SeoSourceMetadataSchema.extend({
  id: z.string().uuid(),
  keyword: z.string().min(1),
  intent: z.enum(['informational', 'navigational', 'commercial', 'transactional', 'mixed']),
  recommendationAction: z.enum(['create', 'update', 'merge', 'prune']),
  difficulty: z.number().min(0).max(100).nullable(),
  searchVolume: z.number().int().nonnegative().nullable(),
  serpTopCompetitors: z.array(SeoSerpCompetitorSchema),
  seasonalityPattern: z.array(z.number().min(0).max(100)).length(12).nullable(),
  priorityScore: z.number().nonnegative(),
  seasonalityStatus: z.enum(['available', 'unavailable']),
});

export const SeoClusterStatusSchema = z.enum(['planned', 'active', 'completed', 'paused']);
export const SeoClusterPageStatusSchema = z.enum(['planned', 'draft', 'optimized', 'published']);

export const SeoCreateClusterSchema = z.object({
  action: z.literal('create'),
  websiteId: z.string().uuid(),
  locale: z.string().min(2).max(16),
  contentType: SeoContentTypeSchema,
  name: z.string().min(2).max(140),
  primaryTopic: z.string().min(2).max(200),
  targetCountry: z.string().min(2).max(64),
  targetLanguage: z.string().min(2).max(16),
});

export const SeoAssignClusterKeywordSchema = z.object({
  action: z.literal('assign_keyword'),
  websiteId: z.string().uuid(),
  clusterId: z.string().uuid(),
  keyword: z.string().min(2).max(120),
  intent: z.enum(['informational', 'navigational', 'commercial', 'transactional', 'mixed']).default('informational'),
});

export const SeoAssignClusterPageSchema = z.object({
  action: z.literal('assign_page'),
  websiteId: z.string().uuid(),
  clusterId: z.string().uuid(),
  pageType: SeoPageTypeSchema,
  pageId: z.string().uuid(),
  role: z.enum(['hub', 'spoke', 'support']).default('spoke'),
  targetKeyword: z.string().max(120).optional(),
});

export const SeoUpdateClusterSchema = z.object({
  action: z.literal('update'),
  websiteId: z.string().uuid(),
  clusterId: z.string().uuid(),
  status: SeoClusterStatusSchema.optional(),
  name: z.string().min(2).max(140).optional(),
});

export const SeoClustersPostSchema = z.discriminatedUnion('action', [
  SeoCreateClusterSchema,
  SeoAssignClusterKeywordSchema,
  SeoAssignClusterPageSchema,
  SeoUpdateClusterSchema,
]);

export const SeoClustersQuerySchema = z.object({
  websiteId: z.string().uuid(),
  locale: z.string().min(2).max(16).optional(),
  contentType: SeoContentTypeSchema.optional(),
});

export const SeoBriefStatusSchema = z.enum(['draft', 'approved', 'archived']);

export const SeoBriefCreateSchema = z.object({
  action: z.literal('create'),
  websiteId: z.string().uuid(),
  locale: z.string().min(2).max(16),
  contentType: SeoContentTypeSchema,
  pageType: SeoPageTypeSchema,
  pageId: z.string().uuid(),
  clusterId: z.string().uuid().optional(),
  primaryKeyword: z.string().min(2).max(120),
  secondaryKeywords: z.array(z.string().min(2).max(120)).default([]),
  brief: z.record(z.string(), z.unknown()),
  changeReason: z.string().max(200).optional(),
});

export const SeoBriefTransitionSchema = z.object({
  action: z.enum(['approve', 'archive']),
  websiteId: z.string().uuid(),
  briefId: z.string().uuid(),
});

export const SeoBriefRollbackSchema = z.object({
  action: z.literal('rollback'),
  websiteId: z.string().uuid(),
  briefId: z.string().uuid(),
  version: z.number().int().positive(),
  changeReason: z.string().max(200).optional(),
});

export const SeoBriefPostSchema = z.discriminatedUnion('action', [
  SeoBriefCreateSchema,
  SeoBriefTransitionSchema,
  SeoBriefRollbackSchema,
]);

export const SeoBriefQuerySchema = z.object({
  websiteId: z.string().uuid(),
  pageType: SeoPageTypeSchema.optional(),
  pageId: z.string().uuid().optional(),
  locale: z.string().min(2).max(16).optional(),
});

export const SeoOptimizeRequestSchema = z.object({
  websiteId: z.string().uuid(),
  itemType: SeoItemTypeSchema,
  itemId: z.string().uuid(),
  locale: z.string().min(2).max(16),
  mode: z.enum(['suggest', 'apply']),
  briefId: z.string().uuid().optional(),
  patch: z.record(z.string(), z.unknown()).default({}),
});

export const LocaleAdaptationBodyFaqItemSchema = z.object({
  question: z.string().min(1).max(240),
  answer: z.string().min(1).max(2000),
});

export const LocaleAdaptationBodyContentSchema = z.object({
  body: z.string().min(1).max(20000).optional(),
  seo_intro: z.string().min(1).max(2000).optional(),
  seo_highlights: z.array(z.string().min(1).max(300)).max(20).optional(),
  seo_faq: z.array(LocaleAdaptationBodyFaqItemSchema).max(20).optional(),
});

export const LocaleAdaptationOutputSchemaV1 = z.object({
  meta_title: z.string().min(1).max(70),
  meta_desc: z.string().min(1).max(160),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  h1: z.string().min(1).max(100),
  keywords: z.union([z.array(z.string()).max(10), z.string().max(400)]),
});

export const LocaleAdaptationOutputSchemaV2 = z.object({
  meta_title: z.string().min(1).max(70),
  meta_desc: z.string().min(1).max(160),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  h1: z.string().min(1).max(100),
  keywords: z.union([z.array(z.string()).max(10), z.string().max(400)]),
  body_content: LocaleAdaptationBodyContentSchema.optional(),
});

export const LocaleAdaptationOutputEnvelopeSchemaV2 = z.object({
  schema_version: z.literal('2.0'),
  payload_v2: LocaleAdaptationOutputSchemaV2,
});

export const SeoTranscreateRequestSchema = z.object({
  action: z.enum(['create_draft', 'review', 'apply']),
  websiteId: z.string().uuid(),
  sourceContentId: z.string().uuid(),
  targetContentId: z.string().uuid().optional(),
  pageType: SeoPageTypeSchema,
  sourceLocale: z.string().min(2).max(16),
  targetLocale: z.string().min(2).max(16),
  country: z.string().min(2).max(64),
  language: z.string().min(2).max(16),
  sourceKeyword: z.string().max(120).optional(),
  targetKeyword: z.string().max(120).optional(),
  draft: z.record(z.string(), z.unknown()).default({}),
  draftSource: z.enum(['manual', 'ai', 'tm_exact']).default('manual'),
  aiModel: z.string().max(120).optional(),
  schemaVersion: z.literal('2.0').optional(),
  payloadV2: LocaleAdaptationOutputSchemaV2.optional(),
  aiOutput: z.union([LocaleAdaptationOutputSchemaV1, LocaleAdaptationOutputEnvelopeSchemaV2]).optional(),
  jobId: z.string().uuid().optional(),
});

export const SeoTrackQuerySchema = z.object({
  websiteId: z.string().uuid(),
  from: z.string().date(),
  to: z.string().date(),
  locale: z.string().min(2).max(16).optional(),
  contentType: SeoContentTypeSchema.optional(),
  clusterId: z.string().uuid().optional(),
  decisionGradeOnly: z.coerce.boolean().default(true),
});

export const SeoPageCatalogQuerySchema = z.object({
  websiteId: z.string().uuid(),
  pageType: SeoPageTypeSchema.optional(),
  locale: z.string().min(2).max(16).optional(),
  search: z.string().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(250).default(100),
});

export type SeoSourceMetadata = z.infer<typeof SeoSourceMetadataSchema>;
export type SeoAuditRequest = z.infer<typeof SeoAuditRequestSchema>;
export type SeoAuditQuery = z.infer<typeof SeoAuditQuerySchema>;
export type SeoAuditFinding = z.infer<typeof SeoAuditFindingSchema>;
export type SeoResearchRequest = z.infer<typeof SeoResearchRequestSchema>;
export type SeoKeywordCandidate = z.infer<typeof SeoKeywordCandidateSchema>;
export type SeoClustersPost = z.infer<typeof SeoClustersPostSchema>;
export type SeoClustersQuery = z.infer<typeof SeoClustersQuerySchema>;
export type SeoBriefPost = z.infer<typeof SeoBriefPostSchema>;
export type SeoBriefQuery = z.infer<typeof SeoBriefQuerySchema>;
export type SeoOptimizeRequest = z.infer<typeof SeoOptimizeRequestSchema>;
export type LocaleAdaptationOutputV1 = z.infer<typeof LocaleAdaptationOutputSchemaV1>;
export type LocaleAdaptationOutputV2 = z.infer<typeof LocaleAdaptationOutputSchemaV2>;
export type LocaleAdaptationOutputEnvelopeV2 = z.infer<typeof LocaleAdaptationOutputEnvelopeSchemaV2>;
export type SeoTranscreateRequest = z.infer<typeof SeoTranscreateRequestSchema>;
export type SeoTrackQuery = z.infer<typeof SeoTrackQuerySchema>;
export type SeoPageCatalogQuery = z.infer<typeof SeoPageCatalogQuerySchema>;

export const ProductSeoOverrideProductTypeSchema = z.enum([
  'package_kit',
  'hotel',
  'activity',
  'transfer',
]);

export const ProductSeoOverrideSchema = z.object({
  id: z.string().uuid().optional(),
  websiteId: z.string().uuid(),
  productType: ProductSeoOverrideProductTypeSchema,
  productId: z.string().uuid(),
  locale: z.string().min(2).max(16),
  metaTitle: z.string().max(70).nullable().optional(),
  metaDesc: z.string().max(160).nullable().optional(),
  slug: z.string().max(120).regex(/^[a-z0-9-]+$/).nullable().optional(),
  h1: z.string().max(100).nullable().optional(),
  keywords: z.array(z.string()).max(10).default([]),
  bodyContent: z.string().max(20000).nullable().optional(),
});

export const ProductSeoOverrideUpsertSchema = ProductSeoOverrideSchema.omit({ id: true });

export const ProductSeoOverrideQuerySchema = z.object({
  websiteId: z.string().uuid(),
  productType: ProductSeoOverrideProductTypeSchema,
  productId: z.string().uuid(),
  locale: z.string().min(2).max(16),
});

export type ProductSeoOverrideProductType = z.infer<typeof ProductSeoOverrideProductTypeSchema>;
export type ProductSeoOverride = z.infer<typeof ProductSeoOverrideSchema>;
export type ProductSeoOverrideUpsert = z.infer<typeof ProductSeoOverrideUpsertSchema>;
export type ProductSeoOverrideQuery = z.infer<typeof ProductSeoOverrideQuerySchema>;
