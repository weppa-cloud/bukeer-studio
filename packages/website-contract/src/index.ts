/**
 * @bukeer/website-contract
 *
 * Website platform types and schemas.
 * Consumed by: web-public (Next.js), bukeer-mcp (MCP tools), AI generators.
 *
 * Theme types: canonical source is @bukeer/theme-sdk.
 * This package exports only ThemeV3 (lightweight interface for type-safety).
 */

// Types — Theme v3
export type { ThemeV3 } from './types/theme';

export type {
  WebsiteData,
  WebsiteContent,
  HeaderCTA,
  AnalyticsConfig,
  FeaturedProducts,
  AccountCurrencyRate,
  MarketExperienceSettings,
  MarketSwitcherStyle,
} from './types/website';

export type {
  WebsiteSection,
  PageSection,
  SectionTypeValue,
} from './types/section';
export { SECTION_TYPES } from './types/section';
export type {
  LocalizedString,
  LocalizableAlt,
  MediaAssetAlt,
  MediaAsset,
} from './types/media';
export { resolveAlt } from './types/media';

export type {
  WebsitePage,
  NavigationItem,
  PageType,
  HeaderMode,
} from './types/page';

export type {
  SiteParts,
  HeaderConfig,
  FooterConfig,
  HeaderVariant,
  FooterVariant,
  HeaderBlock,
  FooterBlock,
  MobileStickyBarConfig,
  MobileStickyButton,
  MobileStickyButtonType,
} from './types/site-parts';
export { DEFAULT_SITE_PARTS } from './types/site-parts';

export type {
  ProductData,
  ProductPageCustomization,
  ProductPageData,
  CategoryProducts,
  ScheduleEntry,
  MeetingPoint,
  ActivityPrice,
  ActivityOption,
  PackageVersion,
  ProductFAQ,
} from './types/product';

export type {
  BlogPost,
  BlogCategory,
  FAQItem,
  InternalLink,
  ContentStructure,
  SectionAnalysis,
  ContentScore,
  ScoreCheck,
} from './types/blog';

export type {
  QuoteRequestPayload,
  QuoteRequestResponse,
} from './types/quote';

export type {
  WebsiteTemplate,
  TemplateSectionConfig,
} from './types/template';

// Template Contract v1 types (#572)
export type {
  PageRole,
  SectionBlueprint,
  SectionBlueprintConfig,
  PageBlueprint,
  DetailPageVariant,
  DetailPageConfig,
  BlogDetailConfig,
  DetailPages,
  TemplateContract,
  TemplateCategory,
} from './types/template-contract';

export type {
  CopilotAction,
  CopilotActionType,
  CopilotPlan,
  CopilotSession,
} from './types/copilot';
export { COPILOT_ACTION_TYPES } from './types/copilot';

// Schemas
export {
  SectionType,
  SectionSchema,
  SectionConfigSchema,
  SafeString,
  SafeTitle,
  HeroContentSchema,
  FeaturesContentSchema,
  StatsContentSchema,
  TestimonialsContentSchema,
  PricingContentSchema,
  FaqContentSchema,
  CtaContentSchema,
  RichTextContentSchema,
  GalleryContentSchema,
  ContactFormContentSchema,
  LogoCloudContentSchema,
  BlogGridContentSchema,
  DestinationsContentSchema,
  HotelsContentSchema,
  ActivitiesContentSchema,
  PackagesContentSchema,
  AboutContentSchema,
  PartnersContentSchema,
  NewsletterContentSchema,
  GenericContentSchema,
} from './schemas/sections';
export type { Section } from './schemas/sections';

// Theme schemas removed — use @bukeer/theme-sdk for validation

export {
  QuoteRequestSchema,
} from './schemas/quote';
export type { QuoteRequest } from './schemas/quote';

export {
  TrustCertificationSchema,
  TrustContentSchema,
} from './schemas/trust';
export type { TrustCertification, TrustContent } from './schemas/trust';

export {
  PlaceSourceSchema,
  PlaceCacheRowSchema,
  PlaceCacheInsertSchema,
} from './schemas/places-cache';
export type { PlaceSource, PlaceCacheRow, PlaceCacheInsert } from './schemas/places-cache';

export {
  ScheduleEntrySchema,
  ScheduleEntrySchema as ScheduleStepSchema,
  MeetingPointSchema,
  ActivityPriceSchema,
  ActivityOptionSchema,
  PackageVersionSchema,
  ProductFAQSchema,
  ProductDataSchema,
  ProductPageCustomizationSchema,
  ProductPageDataSchema,
  CategoryProductsSchema,
} from './schemas/product-v2';
export type {
  ProductDataInput,
  ProductDataOutput,
  ProductPageDataInput,
  ProductPageDataOutput,
} from './schemas/product-v2';

// Package aggregated data schema (Gate B — F1 layer, #172)
export {
  PackageAggregatedDataSchema,
} from './schemas/package-aggregated';
export type { PackageAggregatedData } from './schemas/package-aggregated';

// Template Contract v1 schemas (#572)
export {
  PageRoleSchema,
  TemplateCategorySchema,
  SectionBlueprintSchema,
  SectionBlueprintConfigSchema,
  PageBlueprintSchema,
  DetailPageVariantSchema,
  DetailPageConfigSchema,
  BlogDetailConfigSchema,
  DetailPagesSchema,
  TemplateContractSchema,
} from './schemas/template-contract';
export type {
  TemplateContractInput,
  TemplateContractOutput,
} from './schemas/template-contract';

// Payload types (write DTOs)
export type {
  WebsiteCreatePayload,
  WebsiteUpdatePayload,
  WebsitePublishPayload,
  PageCreatePayload,
  PageUpdatePayload,
  PageReorderPayload,
  BlogPostCreatePayload,
  BlogPostUpdatePayload,
  LeadQueryParams,
  ThemeUpdatePayload,
  WebsiteErrorCode,
  WebsiteError,
} from './types/payloads';

// Payload schemas (Zod validation)
export {
  WebsiteCreateSchema,
  WebsiteUpdateSchema,
  WebsitePublishSchema,
  PageCreateSchema,
  PageUpdateSchema,
  PageReorderSchema,
  BlogPostCreateSchema,
  BlogPostUpdateSchema,
  LeadQuerySchema,
  ThemeUpdateSchema,
  WebsiteErrorCodeEnum,
} from './schemas/payloads';

// SEO Content Intelligence (EPIC #86)
export {
  SeoConfidenceSchema,
  SeoSeveritySchema,
  SeoContentTypeSchema,
  SeoItemTypeSchema,
  SeoPageTypeSchema,
  SeoSourceMetadataSchema,
  SeoAuditRequestSchema,
  SeoAuditQuerySchema,
  SeoAuditFindingSchema,
  SeoResearchRequestSchema,
  SeoSerpCompetitorSchema,
  SeoKeywordCandidateSchema,
  SeoClusterStatusSchema,
  SeoClusterPageStatusSchema,
  SeoCreateClusterSchema,
  SeoAssignClusterKeywordSchema,
  SeoAssignClusterPageSchema,
  SeoUpdateClusterSchema,
  SeoClustersPostSchema,
  SeoClustersQuerySchema,
  SeoBriefStatusSchema,
  SeoBriefCreateSchema,
  SeoBriefTransitionSchema,
  SeoBriefRollbackSchema,
  SeoBriefPostSchema,
  SeoBriefQuerySchema,
  SeoOptimizeRequestSchema,
  SeoTranscreateRequestSchema,
  SeoTrackQuerySchema,
  SeoPageCatalogQuerySchema,
  ProductSeoOverrideProductTypeSchema,
  ProductSeoOverrideSchema,
  ProductSeoOverrideUpsertSchema,
  ProductSeoOverrideQuerySchema,
} from './schemas/seo-content-intelligence';
export type {
  SeoSourceMetadata,
  SeoAuditRequest,
  SeoAuditQuery,
  SeoAuditFinding,
  SeoResearchRequest,
  SeoKeywordCandidate,
  SeoClustersPost,
  SeoClustersQuery,
  SeoBriefPost,
  SeoBriefQuery,
  SeoOptimizeRequest,
  SeoTranscreateRequest,
  SeoTrackQuery,
  SeoPageCatalogQuery,
  ProductSeoOverrideProductType,
  ProductSeoOverride,
  ProductSeoOverrideUpsert,
  ProductSeoOverrideQuery,
} from './schemas/seo-content-intelligence';

// Translations / Growth Ops / Human Rhythm (EPIC #128)
export {
  TranslationsListQuerySchema,
  TranslationJobItemSchema,
  TranslationsListResponseSchema,
  TranslationsBulkRequestSchema,
  TranslationsBulkResponseSchema,
  GlossaryItemSchema,
  TranslationMemoryItemSchema,
  HreflangQuerySchema,
  SerpSnapshotRequestSchema,
  SerpSnapshotResponseSchema,
  NlpScoreRequestSchema,
  NlpScoreResponseSchema,
  CannibalizationQuerySchema,
  HreflangAuditRequestSchema,
  HreflangAuditResponseSchema,
  DriftCheckQuerySchema,
  TopicalAuthorityQuerySchema,
  InternalLinksSuggestRequestSchema,
  QaAutofixRequestSchema,
  OkrSchema,
  WeeklyTaskSchema,
  Objective90dSchema,
} from './schemas/translations';
export type {
  TranslationsListQuery,
  TranslationJobItem,
  TranslationsListResponse,
  TranslationsBulkRequest,
  TranslationsBulkResponse,
  GlossaryItem,
  TranslationMemoryItem,
  HreflangQuery,
  SerpSnapshotRequest,
  SerpSnapshotResponse,
  NlpScoreRequest,
  NlpScoreResponse,
  CannibalizationQuery,
  HreflangAuditRequest,
  HreflangAuditResponse,
  DriftCheckQuery,
  TopicalAuthorityQuery,
  InternalLinksSuggestRequest,
  QaAutofixRequest,
  Okr,
  WeeklyTask,
  Objective90d,
} from './schemas/translations';

// Display constants
export {
  PACKAGE_GALLERY_MAX,
  PACKAGE_INCLUSIONS_MAX,
  HOTEL_AMENITIES_MAX,
  SCHEDULE_STEPS_VISIBLE,
} from './constants';

// Online Booking — SPEC #166 (Phase A #168 / Phase B #169 / Phase C #170)
export {
  LeadSourceSchema,
  LeadInputSchema,
  LeadRowSchema,
} from './schemas/leads';
export type { LeadSource, LeadInput, LeadRow } from './schemas/leads';

export {
  BookingStatusSchema,
  ProductAvailabilityRowSchema,
  BookingRowSchema,
  BookingEventSchema,
} from './schemas/bookings';
export type {
  BookingStatus,
  ProductAvailabilityRow,
  BookingRow,
  BookingEvent,
} from './schemas/bookings';

export { WompiEventSchema } from './schemas/wompi';
export type { WompiEvent } from './schemas/wompi';

export {
  CancellationTierSchema,
  CancellationPolicySchema,
  CancellationTokenPayloadSchema,
} from './schemas/cancellation';
export type {
  CancellationTier,
  CancellationPolicy,
  CancellationTokenPayload,
} from './schemas/cancellation';

// AI-generated content schemas — F3 (#174)
export { PackageAiHighlightsSchema } from './schemas/package-ai';
export type { PackageAiHighlights } from './schemas/package-ai';

// Studio Unified Product Editor — Phase 0 (#191)
export {
  CustomSectionSchema,
  CustomSectionsArraySchema,
  CustomSectionTextSchema,
  CustomSectionImageTextSchema,
  CustomSectionCtaSchema,
  CustomSectionSpacerSchema,
} from './schemas/custom-section';
export type {
  CustomSection,
  CustomSectionText,
  CustomSectionImageText,
  CustomSectionCta,
  CustomSectionSpacer,
} from './schemas/custom-section';

export { VideoUrlSchema, VideoUpdateRequestSchema } from './schemas/video-url';
export type { VideoUpdateRequest } from './schemas/video-url';

// Studio Unified Product Editor — Phase 1 (#190) R7 marketing field patches
export {
  MarketingFieldNameSchema,
  MarketingFieldPatchSchema,
  DescriptionPatchSchema,
  HighlightsPatchSchema,
  InclusionsPatchSchema,
  ExclusionsPatchSchema,
  NotesPatchSchema,
  MeetingInfoPatchSchema,
  GalleryPatchSchema,
  SocialImagePatchSchema,
  CoverImagePatchSchema,
  StudioEditorV2FlagResolutionSchema,
  ToggleStudioEditorV2RequestSchema,
} from './schemas/marketing-patch';
export type {
  MarketingFieldName,
  MarketingFieldPatch,
  StudioEditorV2FlagResolution,
  ToggleStudioEditorV2Request,
} from './schemas/marketing-patch';

// Studio AI Cost Ledger — R9 D2 (#195)
export {
  AiCostFeatureSchema,
  AiCostStatusSchema,
  AiCostEventSchema,
  AiCostEventInputSchema,
  AiCostBudgetTierSchema,
  AiCostBudgetSchema,
  AiSpendSummarySchema,
} from './schemas/ai-cost';
export type {
  AiCostFeature,
  AiCostStatus,
  AiCostEvent,
  AiCostEventInput,
  AiCostBudgetTier,
  AiCostBudget,
  AiSpendSummary,
} from './schemas/ai-cost';

// Studio Unified Product Editor — Phase 0.5 (#192) content health
export {
  DataSourceCodeSchema,
  GhostReasonSchema,
  GhostSectionSchema,
  AiFieldSchema,
  ContentHealthSchema,
  ContentHealthListItemSchema,
  ContentHealthListSchema,
  AiFlagsUpdateRequestSchema,
} from './schemas/content-health';
export type {
  DataSourceCode,
  GhostReason,
  GhostSection,
  AiField,
  ContentHealth,
  ContentHealthListItem,
  ContentHealthList,
  AiFlagsUpdateRequest,
} from './schemas/content-health';

// Validation
export {
  validateSection,
  validateSectionContent,
  validateSectionComplete,
} from './validation/validate-section';

export {
  isValidSectionType,
  isValidPageType,
  isValidCategoryType,
  isValidProductType,
  isValidBlogStatus,
  isValidWebsiteStatus,
  PAGE_TYPES,
  CATEGORY_TYPES,
  PRODUCT_TYPES,
  BLOG_STATUSES,
  WEBSITE_STATUSES,
} from './validation/valid-types';
