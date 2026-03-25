/**
 * Schema.org JSON-LD Library
 *
 * This library provides utilities for generating structured data
 * for SEO and AI Answer Engine Optimization (AEO).
 *
 * Supports AI crawlers:
 * - GPTBot (OpenAI)
 * - ClaudeBot / anthropic-ai (Anthropic)
 * - PerplexityBot
 * - Google SGE
 *
 * @example Homepage usage
 * ```tsx
 * import { JsonLd, generateHomepageSchemas } from '@/lib/schema';
 *
 * export default function HomePage({ website }) {
 *   const baseUrl = `https://${website.subdomain}.bukeer.com`;
 *   const schemas = generateHomepageSchemas(website, baseUrl);
 *
 *   return (
 *     <>
 *       <JsonLd data={schemas} />
 *       <main>...</main>
 *     </>
 *   );
 * }
 * ```
 *
 * @example Blog post usage
 * ```tsx
 * import { JsonLd, generateBlogPostSchemas } from '@/lib/schema';
 *
 * export default function BlogPost({ post, website }) {
 *   const baseUrl = `https://${website.subdomain}.bukeer.com`;
 *   const schemas = generateBlogPostSchemas(post, website, baseUrl);
 *
 *   return (
 *     <>
 *       <JsonLd data={schemas} />
 *       <article>...</article>
 *     </>
 *   );
 * }
 * ```
 */

// Components
export { JsonLd, safeStringifySchema } from './json-ld';

// Generators
export {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateCollectionPageSchema,
  generateHomepageSchemas,
  generateBlogPostSchemas,
  generateBlogListingSchemas,
  extractFAQFromSections,
} from './generators';

// Types
export type {
  Organization,
  TravelAgency,
  WebSite,
  Article,
  BlogPosting,
  BreadcrumbList,
  FAQPage,
  CollectionPage,
  SchemaType,
} from './types';
