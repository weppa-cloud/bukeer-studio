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
} from './types/website';

export type {
  WebsiteSection,
  PageSection,
  SectionTypeValue,
} from './types/section';
export { SECTION_TYPES } from './types/section';

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
  ScheduleEntrySchema,
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
} from './schemas/seo-content-intelligence';

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
