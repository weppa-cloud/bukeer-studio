import React from 'react';
import { WebsiteData } from '@/lib/supabase/get-website';

/**
 * Generate JSON-LD structured data for travel agency websites
 */

export interface JsonLdOrganization {
  '@context': 'https://schema.org';
  '@type': 'TravelAgency';
  name: string;
  description?: string;
  url: string;
  logo?: string;
  image?: string;
  telephone?: string;
  email?: string;
  address?: {
    '@type': 'PostalAddress';
    streetAddress?: string;
    addressLocality?: string;
    addressCountry?: string;
  };
  sameAs?: string[];
}

export interface JsonLdWebPage {
  '@context': 'https://schema.org';
  '@type': 'WebPage';
  name: string;
  description?: string;
  url: string;
  isPartOf: {
    '@type': 'WebSite';
    name: string;
    url: string;
  };
}

export interface JsonLdProduct {
  '@context': 'https://schema.org';
  '@type': 'Product' | 'TouristDestination' | 'LodgingBusiness' | 'TouristAttraction' | 'Service';
  name: string;
  description?: string;
  image?: string[];
  url: string;
  offers?: {
    '@type': 'Offer';
    priceCurrency?: string;
    price?: number;
    availability?: string;
  };
}

export interface JsonLdBlogPost {
  '@context': 'https://schema.org';
  '@type': 'BlogPosting';
  headline: string;
  description?: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author: {
    '@type': 'Person' | 'Organization';
    name: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo?: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  mainEntityOfPage: {
    '@type': 'WebPage';
    '@id': string;
  };
}

export interface JsonLdFAQ {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
}

/**
 * Generate Organization JSON-LD for the travel agency
 */
export function generateOrganizationSchema(website: WebsiteData): JsonLdOrganization {
  const content = website.content || {};
  const contact = content.contact || {};
  const social = content.social || {};
  const baseUrl = `https://${website.subdomain}.bukeer.com`;

  // Prefer account data over content data
  const orgName = content.account?.name || content.siteName || website.subdomain;
  const orgLogo = content.account?.logo || content.logo;
  const orgPhone = content.account?.phone || contact.phone;
  const orgEmail = content.account?.email || contact.email;

  const sameAs: string[] = [];
  if (social.facebook) sameAs.push(social.facebook);
  if (social.instagram) sameAs.push(social.instagram);
  if (social.twitter) sameAs.push(social.twitter);
  if (social.linkedin) sameAs.push(social.linkedin);
  if (social.youtube) sameAs.push(social.youtube);

  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: orgName,
    description: content.tagline || undefined,
    url: baseUrl,
    logo: orgLogo || undefined,
    image: orgLogo || undefined,
    telephone: orgPhone || undefined,
    email: orgEmail || undefined,
    address: contact.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: contact.address,
        }
      : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

/**
 * Generate WebPage JSON-LD
 */
export function generateWebPageSchema(
  website: WebsiteData,
  pageTitle: string,
  pageDescription: string | undefined,
  pageUrl: string
): JsonLdWebPage {
  const content = website.content || {};
  const baseUrl = `https://${website.subdomain}.bukeer.com`;

  const webSiteName = content.account?.name || content.siteName || website.subdomain;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitle,
    description: pageDescription,
    url: pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: webSiteName,
      url: baseUrl,
    },
  };
}

/**
 * Generate Product JSON-LD for destinations, hotels, activities
 */
export function generateProductSchema(
  productType: 'destination' | 'hotel' | 'activity' | 'transfer' | 'package',
  product: {
    name: string;
    description?: string;
    images?: string[];
    price?: number;
    currency?: string;
  },
  url: string
): JsonLdProduct {
  const typeMap = {
    destination: 'TouristDestination',
    hotel: 'LodgingBusiness',
    activity: 'TouristAttraction',
    transfer: 'Service',
    package: 'Product',
  } as const;

  return {
    '@context': 'https://schema.org',
    '@type': typeMap[productType],
    name: product.name,
    description: product.description,
    image: product.images,
    url,
    offers: product.price
      ? {
          '@type': 'Offer',
          priceCurrency: product.currency || 'USD',
          price: product.price,
          availability: 'https://schema.org/InStock',
        }
      : undefined,
  };
}

/**
 * Generate BlogPosting JSON-LD
 */
export function generateBlogPostSchema(
  website: WebsiteData,
  post: {
    title: string;
    excerpt?: string;
    featuredImage?: string;
    publishedAt: string;
    updatedAt?: string;
    author?: string;
  },
  url: string
): JsonLdBlogPost {
  const content = website.content || {};
  const publisherName = content.account?.name || content.siteName || website.subdomain;
  const publisherLogo = content.account?.logo || content.logo;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: post.author || publisherName,
    },
    publisher: {
      '@type': 'Organization',
      name: publisherName,
      logo: publisherLogo
        ? {
            '@type': 'ImageObject',
            url: publisherLogo,
          }
        : undefined,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };
}

/**
 * Generate FAQ JSON-LD from FAQ section content
 */
export function generateFAQSchema(
  faqItems: Array<{ question: string; answer: string }>
): JsonLdFAQ {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/**
 * Convert JSON-LD object to script tag content
 */
export function jsonLdToScript(schema: object): string {
  return JSON.stringify(schema);
}

/**
 * Safely stringify schema, handling circular references
 */
export function safeStringifySchema(schema: object): string {
  try {
    return JSON.stringify(schema);
  } catch {
    return '{}';
  }
}

/**
 * JsonLd component for rendering structured data
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const schemas = Array.isArray(data) ? data : [data];

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeStringifySchema(schema),
          }}
        />
      ))}
    </>
  );
}
