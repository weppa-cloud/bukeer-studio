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
} from './types';
import type { WebsiteData, BlogPost, WebsiteSection } from '../supabase/get-website';

/**
 * Generate Organization/TravelAgency schema for a website
 */
export function generateOrganizationSchema(
  website: WebsiteData,
  baseUrl: string
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
  baseUrl: string
): BlogPosting {
  const articleUrl = `${baseUrl}/blog/${post.slug}`;

  // Parse keywords
  const keywords = post.seo_keywords
    ? post.seo_keywords.split(',').map(k => k.trim())
    : undefined;

  // Estimate word count from content (rough estimate)
  const wordCount = post.content
    ? post.content.replace(/<[^>]*>/g, '').split(/\s+/).length
    : undefined;

  const authorName = website.content.account?.name || website.content.siteName;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.seo_title || post.title,
    description: post.seo_description || post.excerpt,
    ...(post.featured_image && {
      image: {
        '@type': 'ImageObject',
        url: post.featured_image,
      },
    }),
    ...(post.published_at && { datePublished: post.published_at }),
    dateModified: post.published_at || new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: authorName,
      url: baseUrl,
    },
    publisher: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: authorName,
      url: baseUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    ...(wordCount && { wordCount }),
    ...(keywords && { keywords }),
    ...(post.category && { articleSection: post.category.name }),
    inLanguage: 'es',
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
  baseUrl: string
): CollectionPage {
  const blogUrl = `${baseUrl}/blog`;

  const itemListElement: ListItem[] = posts.slice(0, 10).map((post, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `${baseUrl}/blog/${post.slug}`,
    name: post.title,
  }));

  const collectionSiteName = website.content.account?.name || website.content.siteName;

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Blog - ${collectionSiteName}`,
    description: `Artículos y noticias de ${collectionSiteName}`,
    url: blogUrl,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement,
      numberOfItems: posts.length,
    },
  };
}

/**
 * Generate all schemas for the homepage
 */
export function generateHomepageSchemas(
  website: WebsiteData,
  baseUrl: string
): object[] {
  const schemas: object[] = [];

  // 1. Organization/TravelAgency schema
  schemas.push(generateOrganizationSchema(website, baseUrl));

  // 2. WebSite schema
  schemas.push(generateWebSiteSchema(website, baseUrl));

  // 3. Breadcrumb for homepage
  schemas.push(generateBreadcrumbSchema([
    { name: 'Inicio', url: baseUrl },
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
  baseUrl: string
): object[] {
  const schemas: object[] = [];

  // 1. Article/BlogPosting schema
  schemas.push(generateArticleSchema(post, website, baseUrl));

  // 2. Breadcrumb schema
  schemas.push(generateBreadcrumbSchema([
    { name: 'Inicio', url: baseUrl },
    { name: 'Blog', url: `${baseUrl}/blog` },
    { name: post.title },
  ]));

  // 3. Organization schema (for publisher context)
  schemas.push(generateOrganizationSchema(website, baseUrl));

  return schemas;
}

/**
 * Generate all schemas for blog listing page
 */
export function generateBlogListingSchemas(
  posts: BlogPost[],
  website: WebsiteData,
  baseUrl: string
): object[] {
  const schemas: object[] = [];

  // 1. CollectionPage schema
  schemas.push(generateCollectionPageSchema(posts, website, baseUrl));

  // 2. Breadcrumb schema
  schemas.push(generateBreadcrumbSchema([
    { name: 'Inicio', url: baseUrl },
    { name: 'Blog' },
  ]));

  // 3. Organization schema
  schemas.push(generateOrganizationSchema(website, baseUrl));

  return schemas;
}
