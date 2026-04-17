import type { TrustContent, WebsiteData } from '@bukeer/website-contract';
import { normalizeLanguage } from './product-schema';

interface OrganizationSchemaProps {
  website: WebsiteData;
  websiteUrl?: string;
}

export function OrganizationSchema({ website, websiteUrl }: OrganizationSchemaProps) {
  const schema = buildOrganizationSchema(website, websiteUrl);
  if (!schema) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function buildOrganizationSchema(
  website: WebsiteData,
  websiteUrl: string | undefined,
): Record<string, unknown> | null {
  const name = website.content?.account?.name || website.content?.siteName;
  if (!name) return null;

  const trust = website.content?.trust as TrustContent | undefined;
  const inLanguage = normalizeLanguage(website.content?.locale ?? website.default_locale ?? null);

  const sameAs = collectSameAs(website);
  const address = buildAddress(website);
  const identifiers = buildIdentifiers(trust);
  const awards = buildAwards(trust);

  const payload: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name,
    url: websiteUrl,
    inLanguage,
    logo: website.content?.logo || website.content?.account?.logo || undefined,
    description: website.content?.seo?.description || website.content?.tagline,
    email: website.content?.contact?.email || website.content?.account?.email,
    telephone: website.content?.contact?.phone || website.content?.account?.phone,
    address,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    identifier: identifiers.length > 0 ? identifiers : undefined,
    award: awards.length > 0 ? awards : undefined,
  };

  if (trust?.travelers_count && trust.travelers_count > 0) {
    payload.knowsAbout = [
      {
        '@type': 'QuantitativeValue',
        name: 'travelers_served',
        value: trust.travelers_count,
      },
    ];
  }

  if (trust?.years_active && trust.years_active > 0) {
    const foundingYear = new Date().getUTCFullYear() - trust.years_active;
    payload.foundingDate = String(foundingYear);
  }

  return clean(payload);
}

function collectSameAs(website: WebsiteData): string[] {
  const social = website.content?.social ?? {};
  return Object.values(social)
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());
}

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildAddress(website: WebsiteData): Record<string, unknown> | undefined {
  const candidates = [website.content?.contact?.address, website.content?.account?.location];
  const street = candidates.find((value): value is string => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return trimmed.length > 0 && !UUID_SHAPE.test(trimmed);
  });
  if (!street) return undefined;
  return {
    '@type': 'PostalAddress',
    streetAddress: street.trim(),
  };
}

function buildIdentifiers(trust: TrustContent | undefined): Record<string, unknown>[] {
  if (!trust) return [];

  const identifiers: Record<string, unknown>[] = [];

  if (trust.rnt_number && trust.rnt_number.trim().length > 0) {
    identifiers.push({
      '@type': 'PropertyValue',
      propertyID: 'RNT',
      name: 'Registro Nacional de Turismo',
      value: trust.rnt_number.trim(),
    });
  }

  return identifiers;
}

function buildAwards(trust: TrustContent | undefined): string[] {
  if (!trust?.certifications) return [];
  return trust.certifications
    .filter((c) => c && typeof c.label === 'string' && c.label.trim().length > 0)
    .map((c) => c.label.trim());
}

function clean(obj: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj));
}
