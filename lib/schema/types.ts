/**
 * Schema.org TypeScript Types for JSON-LD
 *
 * These types represent the structured data schemas used for SEO
 * and AI search engine optimization (AEO).
 */

export interface Thing {
  '@type': string;
  name?: string;
  description?: string;
  url?: string;
  image?: string | ImageObject;
}

export interface ImageObject {
  '@type': 'ImageObject';
  url: string;
  width?: number;
  height?: number;
  caption?: string;
  /** Human-readable name — used by Google Images rich results */
  name?: string;
  /** Detailed description for AI crawlers and Google Image search */
  description?: string;
  /** Person who took or shared the photo */
  author?: Person;
  /** Geographic context (e.g. "Colombia", "Cartagena") */
  contentLocation?: { '@type': 'Place'; name: string };
}

export interface PostalAddress {
  '@type': 'PostalAddress';
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}

export interface ContactPoint {
  '@type': 'ContactPoint';
  telephone?: string;
  email?: string;
  contactType?: string;
  availableLanguage?: string | string[];
}

export interface Organization {
  '@context'?: 'https://schema.org';
  '@type': 'Organization' | 'TravelAgency' | 'LocalBusiness';
  name: string;
  url: string;
  logo?: string | ImageObject;
  description?: string;
  address?: PostalAddress;
  contactPoint?: ContactPoint;
  email?: string;
  telephone?: string;
  sameAs?: string[];
  foundingDate?: string;
  slogan?: string;
}

// Organization with required @context for top-level schemas
export interface OrganizationSchema extends Organization {
  '@context': 'https://schema.org';
}

export interface TravelAgency extends Organization {
  '@type': 'TravelAgency';
  priceRange?: string;
  openingHours?: string;
  geo?: GeoCoordinates;
  /**
   * User-generated travel photos cached from Google Reviews.
   * Google uses this array for rich results in Image Search
   * and as trust signals for the LocalBusiness entity.
   */
  photo?: ImageObject[];
}

export interface GeoCoordinates {
  '@type': 'GeoCoordinates';
  latitude: number;
  longitude: number;
}

export interface WebSite {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  url: string;
  description?: string;
  publisher?: Organization;
  potentialAction?: SearchAction;
}

export interface SearchAction {
  '@type': 'SearchAction';
  target: string;
  'query-input': string;
}

export interface BreadcrumbList {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  '@type': 'ListItem';
  position: number;
  name: string;
  item?: string;
}

export interface Article {
  '@context': 'https://schema.org';
  '@type': 'Article' | 'BlogPosting' | 'NewsArticle';
  headline: string;
  description?: string;
  image?: string | ImageObject | (string | ImageObject)[];
  datePublished?: string;
  dateModified?: string;
  author?: Organization | Person;
  publisher?: Organization;
  mainEntityOfPage?: string | WebPage;
  articleBody?: string;
  wordCount?: number;
  keywords?: string[];
  articleSection?: string;
  inLanguage?: string;
  reviewedBy?: Organization | Person;
  about?: Thing | Thing[];
  mentions?: Thing[];
}

export interface BlogPosting extends Article {
  '@type': 'BlogPosting';
}

export interface Person {
  '@type': 'Person';
  name: string;
  url?: string;
  image?: string;
}

export interface WebPage {
  '@type': 'WebPage';
  '@id': string;
  url?: string;
  name?: string;
}

export interface FAQPage {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: Question[];
}

export interface Question {
  '@type': 'Question';
  name: string;
  acceptedAnswer: Answer;
}

export interface Answer {
  '@type': 'Answer';
  text: string;
}

export interface CollectionPage {
  '@context': 'https://schema.org';
  '@type': 'CollectionPage';
  name: string;
  description?: string;
  url: string;
  mainEntity?: ItemList;
}

export interface ItemList {
  '@type': 'ItemList';
  itemListElement: ListItem[];
  numberOfItems?: number;
}

export interface ListItem {
  '@type': 'ListItem';
  position: number;
  url: string;
  name?: string;
}

// Combined schema type for pages with multiple schemas
export type SchemaType =
  | Organization
  | TravelAgency
  | WebSite
  | BreadcrumbList
  | Article
  | BlogPosting
  | FAQPage
  | CollectionPage;
