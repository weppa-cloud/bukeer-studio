/**
 * Schema.org JSON-LD Generators
 *
 * Functions to generate structured data for SEO and AEO
 * (Answer Engine Optimization for AI crawlers like GPTBot, ClaudeBot, PerplexityBot)
 */

import type {
  TravelAgency,
  BlogPosting,
  BreadcrumbList,
  BreadcrumbItem,
  FAQPage,
  Question,
  WebSite,
  CollectionPage,
  ListItem,
  ImageObject,
} from './types';
import type { WebsiteData, BlogPost, WebsiteSection } from '../supabase/get-website';
import {
  buildPublicLocalizedPath,
  localeToLanguage,
  normalizeBlogLocale,
  normalizeLocale,
} from '@/lib/seo/locale-routing';

const VALID_LOCALE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;

function isValidLocale(value: unknown): value is string {
  return typeof value === 'string' && VALID_LOCALE_PATTERN.test(value.trim());
}

function resolveSchemaLanguage(
  post: BlogPost,
  website: WebsiteData,
  requestLocale?: string | null,
): string {
  // Issue #208: request scope wins. Middleware sets `x-public-resolved-locale`
  // and RSC pages forward it via `resolvePublicMetadataLocale`. A well-formed
  // request locale (e.g. `/en/...` → `en-US`) must override the website
  // default so JSON-LD `inLanguage` matches the rendered page language.
  if (requestLocale && isValidLocale(requestLocale)) {
    return normalizeLocale(requestLocale);
  }

  // Wrap stored locale in legacy-code normalizer so rows with
  // `locale='es'`/`'en'` (WordPress migration) emit canonical BCP-47.
  if (post.locale) {
    const canonical = normalizeBlogLocale(post.locale);
    if (canonical) return normalizeLocale(canonical);
  }

  const websiteWithLocale = website as unknown as Record<string, unknown>;
  const language = websiteWithLocale.language;
  const locale = websiteWithLocale.locale;
  const defaultLocale = websiteWithLocale.default_locale ?? websiteWithLocale.defaultLocale;

  if (typeof language === 'string' && language.trim().length > 0) {
    return normalizeLocale(language);
  }

  if (typeof locale === 'string' && locale.trim().length > 0) {
    return normalizeLocale(locale);
  }

  if (typeof defaultLocale === 'string' && defaultLocale.trim().length > 0) {
    return normalizeLocale(defaultLocale);
  }

  return normalizeLocale('es-CO');
}

function resolveSchemaDefaultLocale(website: WebsiteData): string {
  const websiteWithLocale = website as unknown as Record<string, unknown>;
  const defaultLocale =
    websiteWithLocale.default_locale ??
    websiteWithLocale.defaultLocale ??
    websiteWithLocale.locale ??
    'es-CO';

  return normalizeLocale(typeof defaultLocale === 'string' ? defaultLocale : 'es-CO');
}

function buildSchemaBlogPath(
  post: BlogPost,
  website: WebsiteData,
  requestLocale?: string | null,
): string {
  return buildPublicLocalizedPath(
    `/blog/${post.slug}`,
    resolveSchemaLanguage(post, website, requestLocale),
    resolveSchemaDefaultLocale(website),
  );
}

function resolveSchemaUiLanguage(localeLike: string | null | undefined): 'es' | 'en' {
  const language = localeToLanguage(normalizeLocale(localeLike ?? 'es-CO'));
  return language === 'en' ? 'en' : 'es';
}

function schemaLabel(labelKey: 'home' | 'blog' | 'blogCollectionDescription', localeLike: string | null | undefined): string {
  const language = resolveSchemaUiLanguage(localeLike);
  if (language === 'en') {
    if (labelKey === 'home') return 'Home';
    if (labelKey === 'blog') return 'Blog';
    return 'Travel guides and updates from';
  }

  if (labelKey === 'home') return 'Inicio';
  if (labelKey === 'blog') return 'Blog';
  return 'Artículos y noticias de';
}

function buildArticleEntityTerms(post: BlogPost): string[] {
  const terms = new Set<string>();
  if (post.category?.name) terms.add(post.category.name);
  if (Array.isArray(post.seo_keywords)) {
    for (const keyword of post.seo_keywords) {
      if (typeof keyword === 'string' && keyword.trim().length > 0) {
        terms.add(keyword.trim());
      }
    }
  }
  return Array.from(terms).slice(0, 8);
}

function resolveBlogAuthor(post: BlogPost, website: WebsiteData, baseUrl: string): BlogPosting['author'] {
  if (post.author_name && post.author_name.trim().length > 0) {
    return {
      '@type': 'Person',
      name: post.author_name.trim(),
      ...(post.author_avatar && { image: post.author_avatar }),
    };
  }

  return {
    '@type': 'Organization',
    name: website.content.account?.name || website.content.siteName,
    url: baseUrl,
  };
}

function resolveBlogReviewer(post: BlogPost, baseUrl: string): BlogPosting['reviewedBy'] | undefined {
  const postRecord = post as unknown as Record<string, unknown>;
  const reviewerName = [
    postRecord.reviewed_by_name,
    postRecord.reviewer_name,
    postRecord.planner_name,
  ].find((value): value is string => typeof value === 'string' && value.trim().length > 0);

  if (!reviewerName) return undefined;

  const reviewerUrl = [
    postRecord.reviewed_by_url,
    postRecord.reviewer_url,
    postRecord.planner_url,
  ].find((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return {
    '@type': 'Person',
    name: reviewerName.trim(),
    ...(reviewerUrl ? { url: reviewerUrl.trim() } : { url: baseUrl }),
  };
}

/**
 * Extract user-generated travel photos from the testimonials section.
 *
 * These images are Google Review photos that have been cached into Supabase
 * Storage via /api/cache-review-photos. Using Supabase CDN URLs (instead of
 * lh3.googleusercontent.com) means Google can crawl them without rate-limit
 * issues and they persist even if the review is deleted.
 *
 * Each ImageObject gets:
 *  - url: Supabase Storage CDN URL (stable, cacheable)
 *  - name: "{reviewer} · {agencyName}" — appears in Google Images captions
 *  - description: first 120 chars of the review text — feeds AI answer engines
 *  - author: Person node — helps Google associate photo with a real reviewer
 *  - contentLocation: Place "Colombia" — topical geo signal
 *
 * @param sections  - Enabled website sections (from hydrateSections output)
 * @param agencyName - Agency name for caption context
 * @returns Array of ImageObject (empty if no cached photos found)
 */
export function extractReviewImages(
  sections: WebsiteSection[],
  agencyName: string
): ImageObject[] {
  const testimonialsSection = sections.find(
    (s) => s.section_type === 'testimonials' && s.is_enabled
  );
  if (!testimonialsSection?.content) return [];

  const content = testimonialsSection.content as {
    testimonials?: Array<{
      name: string;
      text?: string;
      content?: string;
      images?: Array<string | { url: string; thumbnail?: string }>;
    }>;
  };

  if (!content.testimonials?.length) return [];

  const result: ImageObject[] = [];

  for (const testimonial of content.testimonials) {
    if (!testimonial.images?.length) continue;

    const reviewText = (testimonial.text || testimonial.content || '').slice(0, 120).trim();

    for (const imgEntry of testimonial.images) {
      const url = typeof imgEntry === 'string' ? imgEntry : imgEntry.url;

      // Prefer cached Supabase Storage URLs (stable, crawlable).
      // Also accept Google CDN review photo domains — these are large photo
      // uploads from reviewers (geougc-cs), not ephemeral profile thumbnails.
      // TODO: cache all images to Supabase Storage for long-term stability.
      const isCached = url.includes('supabase.co/storage');
      const isGoogleReviewPhoto = url.includes('googleusercontent.com/geougc-cs');
      if (!url || (!isCached && !isGoogleReviewPhoto)) continue;

      result.push({
        '@type': 'ImageObject',
        url,
        name: `${testimonial.name} · ${agencyName}`,
        ...(reviewText && { description: reviewText }),
        author: { '@type': 'Person', name: testimonial.name },
        contentLocation: { '@type': 'Place', name: 'Colombia' },
      });
    }
  }

  return result;
}

/**
 * Generate Organization/TravelAgency schema for a website
 */
export function generateOrganizationSchema(
  website: WebsiteData,
  baseUrl: string,
  reviewImages?: ImageObject[]
): TravelAgency {
  const { content } = website;

  // Build social links array
  const sameAs: string[] = [];
  if (content.social?.facebook) sameAs.push(content.social.facebook);
  if (content.social?.instagram) sameAs.push(content.social.instagram);
  if (content.social?.twitter) sameAs.push(content.social.twitter);
  if (content.social?.youtube) sameAs.push(content.social.youtube);
  if (content.social?.linkedin) sameAs.push(content.social.linkedin);
  if (content.social?.tiktok) sameAs.push(content.social.tiktok);

  // Prefer account data over content data
  const orgName = content.account?.name || content.siteName;
  const orgEmail = content.account?.email || content.contact?.email;
  const orgPhone = content.account?.phone || content.contact?.phone;

  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: orgName,
    url: baseUrl,
    description: content.seo?.description || content.tagline,
    slogan: content.tagline,
    ...(orgEmail && { email: orgEmail }),
    ...(orgPhone && { telephone: orgPhone }),
    ...(content.contact?.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: content.contact.address,
      },
    }),
    contactPoint: {
      '@type': 'ContactPoint',
      ...(orgPhone && { telephone: orgPhone }),
      ...(orgEmail && { email: orgEmail }),
      contactType: 'customer service',
      availableLanguage: ['Spanish', 'English'],
    },
    ...(sameAs.length > 0 && { sameAs }),
    // User-generated travel photos from Google Reviews (cached to Supabase Storage).
    // Google uses photo[] on TravelAgency/LocalBusiness for Knowledge Panel images
    // and as a trust signal when evaluating the entity's real-world presence.
    ...(reviewImages && reviewImages.length > 0 && { photo: reviewImages }),
  };
}

/**
 * Generate WebSite schema
 */
export function generateWebSiteSchema(
  website: WebsiteData,
  baseUrl: string
): WebSite {
  const siteName = website.content.account?.name || website.content.siteName;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: baseUrl,
    description: website.content.seo?.description || website.content.tagline,
    publisher: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteName,
      url: baseUrl,
    },
  };
}

/**
 * Generate Article/BlogPosting schema for a blog post
 */
export function generateArticleSchema(
  post: BlogPost,
  website: WebsiteData,
  baseUrl: string,
  requestLocale?: string | null,
): BlogPosting {
  const articleUrl = `${baseUrl}${buildSchemaBlogPath(post, website, requestLocale)}`;

  // seo_keywords is TEXT[] in DB — use directly, no split needed
  const keywords = post.seo_keywords && post.seo_keywords.length > 0
    ? post.seo_keywords
    : undefined;

  // Estimate word count from content (rough estimate)
  const wordCount = post.content
    ? post.content.replace(/<[^>]*>/g, '').split(/\s+/).length
    : undefined;

  const publisherName = website.content.account?.name || website.content.siteName;
  const author = resolveBlogAuthor(post, website, baseUrl);
  const reviewedBy = resolveBlogReviewer(post, baseUrl);
  const articleTerms = buildArticleEntityTerms(post);
  const about = post.category?.name
    ? {
        '@type': 'Thing',
        name: post.category.name,
      }
    : articleTerms.length > 0
      ? {
          '@type': 'TouristDestination',
          name: articleTerms[0],
        }
      : undefined;
  const mentions = articleTerms
    .filter((term) => term !== post.category?.name)
    .map((term) => ({
      '@type': 'Thing',
      name: term,
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.seo_title || post.title,
    description: post.seo_description || post.excerpt,
    ...(post.featured_image && {
      image: {
        '@type': 'ImageObject',
        url: post.featured_image,
        ...(post.featured_alt && { caption: post.featured_alt }),
        ...(post.featured_alt && { name: post.featured_alt }),
      },
    }),
    ...(post.published_at && { datePublished: post.published_at }),
    ...(post.updated_at || post.published_at
      ? { dateModified: post.updated_at || post.published_at || undefined }
      : {}),
    author,
    ...(reviewedBy && { reviewedBy }),
    publisher: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: publisherName,
      url: baseUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    ...(wordCount && { wordCount }),
    ...(keywords && { keywords }),
    ...(post.category && { articleSection: post.category.name }),
    ...(about && { about }),
    ...(mentions.length > 0 && { mentions }),
    inLanguage: resolveSchemaLanguage(post, website, requestLocale),
  };
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(
  items: { name: string; url?: string }[]
): BreadcrumbList {
  const itemListElement: BreadcrumbItem[] = items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    ...(item.url && { item: item.url }),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };
}

/**
 * Generate FAQPage schema from FAQ section content
 */
export function generateFAQSchema(
  faqItems: Array<{ question: string; answer: string }>
): FAQPage {
  const mainEntity: Question[] = faqItems.map(item => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
}

/**
 * Extract FAQ items from website sections
 */
export function extractFAQFromSections(
  sections: WebsiteSection[]
): Array<{ question: string; answer: string }> | null {
  const faqSection = sections.find(s => s.section_type === 'faq' && s.is_enabled);

  if (!faqSection || !faqSection.content) return null;

  const items = (faqSection.content as { items?: Array<{ question: string; answer: string }> }).items;

  if (!items || items.length === 0) return null;

  return items;
}

/**
 * Generate CollectionPage schema for blog listing
 */
export function generateCollectionPageSchema(
  posts: BlogPost[],
  website: WebsiteData,
  baseUrl: string,
  resolvedLocale?: string | null,
): CollectionPage {
  const defaultLocale = resolveSchemaDefaultLocale(website);
  const blogUrl = `${baseUrl}${buildPublicLocalizedPath('/blog', resolvedLocale ?? defaultLocale, defaultLocale)}`;

  const itemListElement: ListItem[] = posts.slice(0, 10).map((post, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `${baseUrl}${buildSchemaBlogPath(post, website, resolvedLocale)}`,
    name: post.title,
  }));

  const collectionSiteName = website.content.account?.name || website.content.siteName;

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Blog - ${collectionSiteName}`,
    description: `${schemaLabel('blogCollectionDescription', resolvedLocale)} ${collectionSiteName}`,
    url: blogUrl,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement,
      numberOfItems: posts.length,
    },
  };
}

/**
 * Generate all schemas for the homepage.
 *
 * Includes: TravelAgency (with cached review photos), WebSite, BreadcrumbList,
 * and optional FAQPage. The review photos are injected as photo[] on the
 * TravelAgency node — this feeds Google's Knowledge Panel and image search
 * indexing without creating a separate schema block.
 *
 * @param reviewImages - Optional pre-fetched review images (e.g. from account_google_reviews).
 *   When provided, these take precedence over images extracted from section content.
 */
export function generateHomepageSchemas(
  website: WebsiteData,
  baseUrl: string,
  reviewImages?: ImageObject[],
  resolvedLocale?: string | null,
): object[] {
  const schemas: object[] = [];

  // Use pre-fetched images when available (e.g. real Google Reviews fetched server-side).
  // Fall back to extracting from sections content (e.g. static/cached testimonials).
  const agencyName = website.content.account?.name || website.content.siteName || '';
  const images = reviewImages ?? extractReviewImages(website.sections || [], agencyName);

  // 1. Organization/TravelAgency schema — includes photo[] when available
  schemas.push(generateOrganizationSchema(website, baseUrl, images));

  // 2. WebSite schema
  schemas.push(generateWebSiteSchema(website, baseUrl));

  // 3. Breadcrumb for homepage
  schemas.push(generateBreadcrumbSchema([
    { name: schemaLabel('home', resolvedLocale), url: baseUrl },
  ]));

  // 4. FAQ schema if FAQ section exists
  const faqItems = extractFAQFromSections(website.sections || []);
  if (faqItems && faqItems.length > 0) {
    schemas.push(generateFAQSchema(faqItems));
  }

  return schemas;
}

/**
 * Generate all schemas for a blog post page
 */
export function generateBlogPostSchemas(
  post: BlogPost,
  website: WebsiteData,
  baseUrl: string,
  resolvedLocale?: string | null,
): object[] {
  const schemas: object[] = [];

  // 1. Article/BlogPosting schema — request locale wins over post/website fallback
  schemas.push(generateArticleSchema(post, website, baseUrl, resolvedLocale));

  // 2. FAQPage schema (when post has faq_items from v2 generator)
  if (post.faq_items && post.faq_items.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq_items.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });
  }

  // 3. Breadcrumb schema
  const defaultLocale = resolveSchemaDefaultLocale(website);
  schemas.push(generateBreadcrumbSchema([
    { name: schemaLabel('home', resolvedLocale), url: baseUrl },
    {
      name: schemaLabel('blog', resolvedLocale),
      url: `${baseUrl}${buildPublicLocalizedPath('/blog', resolvedLocale ?? defaultLocale, defaultLocale)}`,
    },
    { name: post.title },
  ]));

  // 4. Organization schema (for publisher context)
  schemas.push(generateOrganizationSchema(website, baseUrl));

  return schemas;
}

/**
 * Generate all schemas for blog listing page
 */
export function generateBlogListingSchemas(
  posts: BlogPost[],
  website: WebsiteData,
  baseUrl: string,
  resolvedLocale?: string | null,
): object[] {
  const schemas: object[] = [];

  // 1. CollectionPage schema
  schemas.push(generateCollectionPageSchema(posts, website, baseUrl, resolvedLocale));

  // 2. Breadcrumb schema
  schemas.push(generateBreadcrumbSchema([
    { name: schemaLabel('home', resolvedLocale), url: baseUrl },
    { name: schemaLabel('blog', resolvedLocale) },
  ]));

  // 3. Organization schema
  schemas.push(generateOrganizationSchema(website, baseUrl));

  return schemas;
}
