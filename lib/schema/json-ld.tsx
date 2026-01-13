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
  '@type': 'Product' | 'TouristDestination' | 'LodgingBusiness' | 'TouristAttraction';
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

  const sameAs: string[] = [];
  if (social.facebook) sameAs.push(social.facebook);
  if (social.instagram) sameAs.push(social.instagram);
  if (social.twitter) sameAs.push(social.twitter);
  if (social.linkedin) sameAs.push(social.linkedin);
  if (social.youtube) sameAs.push(social.youtube);

  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: content.siteName || website.subdomain,
    description: content.tagline || undefined,
    url: baseUrl,
    logo: content.logo || undefined,
    image: content.logo || undefined,
    telephone: contact.phone || undefined,
    email: contact.email || undefined,
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

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitle,
    description: pageDescription,
    url: pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: content.siteName || website.subdomain,
      url: baseUrl,
    },
  };
}

/**
 * Generate Product JSON-LD for destinations, hotels, activities
 */
export function generateProductSchema(
  productType: 'destination' | 'hotel' | 'activity' | 'package',
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
      name: post.author || content.siteName || website.subdomain,
    },
    publisher: {
      '@type': 'Organization',
      name: content.siteName || website.subdomain,
      logo: content.logo
        ? {
            '@type': 'ImageObject',
            url: content.logo,
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
