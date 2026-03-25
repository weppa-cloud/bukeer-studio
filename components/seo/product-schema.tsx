import type { ProductData } from '@bukeer/website-contract';

// ── Public types ──────────────────────────────────────────────────────────────

interface ProductSchemaProps {
  product: ProductData;
  productType: string;
  websiteUrl?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductSchema({
  product,
  productType,
  websiteUrl,
}: ProductSchemaProps) {
  if (!product?.name) return null;

  const schemas = generateSchemas(product, productType, websiteUrl);
  if (schemas.length === 0) return null;

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

// ── Schema generation ─────────────────────────────────────────────────────────

/**
 * Returns an array of JSON-LD objects: the product schema + the breadcrumb.
 * Undefined values are stripped via the `clean` helper so search engines
 * never see `null`/`undefined` fields.
 */
function generateSchemas(
  product: ProductData,
  productType: string,
  websiteUrl?: string,
): Record<string, unknown>[] {
  const productSchema = buildProductSchema(product, productType, websiteUrl);
  const breadcrumb = buildBreadcrumbSchema(product, productType, websiteUrl);

  const schemas: Record<string, unknown>[] = [];
  if (productSchema) schemas.push(productSchema);
  if (breadcrumb) schemas.push(breadcrumb);
  return schemas;
}

function buildProductSchema(
  product: ProductData,
  productType: string,
  websiteUrl?: string,
): Record<string, unknown> | null {
  switch (productType) {
    case 'hotel':
      return clean(buildHotelSchema(product, websiteUrl));
    case 'activity':
      return clean(buildActivitySchema(product, websiteUrl));
    case 'transfer':
      return clean(buildTransferSchema(product, websiteUrl));
    case 'destination':
      return clean(buildDestinationSchema(product, websiteUrl));
    case 'package':
      return clean(buildPackageSchema(product, websiteUrl));
    default:
      return null;
  }
}

// ── Per-type builders ─────────────────────────────────────────────────────────

function buildHotelSchema(product: ProductData, websiteUrl?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: product.name,
    description: product.description,
    image: product.image,
    url: websiteUrl,
    address: buildAddress(product),
    starRating: product.star_rating
      ? {
          '@type': 'Rating',
          ratingValue: product.star_rating,
        }
      : undefined,
    amenityFeature: product.amenities?.map((a) => ({
      '@type': 'LocationFeatureSpecification',
      name: a,
    })),
  };
}

function buildActivitySchema(product: ProductData, websiteUrl?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: product.name,
    description: product.description,
    image: product.image,
    url: websiteUrl,
    address: buildAddress(product),
  };
}

function buildTransferSchema(product: ProductData, websiteUrl?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TaxiService',
    name: product.name,
    description: product.description,
    url: websiteUrl,
    areaServed: (product.from_location || product.location)
      ? {
          '@type': 'Place',
          name: product.from_location || product.location,
        }
      : undefined,
  };
}

function buildDestinationSchema(product: ProductData, websiteUrl?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: product.name,
    description: product.description,
    image: product.image,
    url: websiteUrl,
    address: buildAddress(product),
  };
}

function buildPackageSchema(product: ProductData, websiteUrl?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: product.name,
    description: product.description,
    image: product.image,
    url: websiteUrl,
    touristType: 'Leisure',
    itinerary: product.itinerary_items?.length
      ? {
          '@type': 'ItemList',
          itemListElement: product.itinerary_items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.title || `Day ${i + 1}`,
          })),
        }
      : undefined,
  };
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  destination: 'Destinos',
  hotel: 'Hoteles',
  activity: 'Actividades',
  transfer: 'Traslados',
  package: 'Paquetes',
};

const PRODUCT_TYPE_SLUGS: Record<string, string> = {
  destination: 'destinos',
  hotel: 'hoteles',
  activity: 'actividades',
  transfer: 'traslados',
  package: 'paquetes',
};

function buildBreadcrumbSchema(
  product: ProductData,
  productType: string,
  websiteUrl?: string,
): Record<string, unknown> | null {
  if (!websiteUrl) return null;

  const typeName = PRODUCT_TYPE_LABELS[productType];
  const typeSlug = PRODUCT_TYPE_SLUGS[productType];
  if (!typeName || !typeSlug) return null;

  return clean({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: websiteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: typeName,
        item: `${websiteUrl}/${typeSlug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
      },
    ],
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildAddress(product: ProductData) {
  const locality =
    product.city || product.location;
  if (!locality) return undefined;

  return {
    '@type': 'PostalAddress',
    addressLocality: locality,
    addressCountry: product.country,
  };
}

/**
 * Strip `undefined` / `null` values from any nested object so that
 * `JSON.stringify` produces clean JSON-LD without `null` fields.
 */
function clean(obj: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj));
}
