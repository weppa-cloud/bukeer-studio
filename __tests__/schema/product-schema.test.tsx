import { renderToStaticMarkup } from 'react-dom/server';
import type { ProductData } from '@bukeer/website-contract';

import { ProductSchema } from '@/components/seo/product-schema';

function extractJsonLd(markup: string): Array<Record<string, unknown>> {
  const matches = markup.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g);
  return Array.from(matches).map((match) => JSON.parse(match[1] ?? '{}'));
}

describe('ProductSchema JSON-LD', () => {
  it('emits TouristTrip plus Product and a complete verified Offer for sellable packages', () => {
    const product: ProductData & { availability: string; cancellation_policy: unknown } = {
      id: 'pkg-001',
      name: 'Cartagena and Tayrona 7 days',
      slug: 'cartagena-tayrona-7-days',
      type: 'package',
      description: 'A curated Colombia itinerary with local logistics.',
      location: 'Cartagena',
      country: 'Colombia',
      price: 1800,
      currency: 'USD',
      availability: 'available',
      image: 'https://example.com/package.jpg',
      itinerary_items: [
        { day: 1, title: 'Cartagena', description: 'Arrival and old city walk.' },
        { day: 2, title: 'Tayrona', description: 'Transfer and beach trail.' },
      ],
      cancellation_policy: {
        tiers: [{ days_before: 15, refund_pct: 80, label: '80% refund up to 15 days before travel' }],
      },
    };

    const schemas = extractJsonLd(renderToStaticMarkup(
      <ProductSchema
        product={product}
        productType="package"
        websiteUrl="https://colombiatours.travel/paquetes/cartagena-tayrona-7-days"
        organizationName="ColombiaTours"
        language="es-CO"
      />
    ));

    const trip = schemas.find((schema) => schema['@type'] === 'TouristTrip') as Record<string, any>;
    const commercialProduct = schemas.find((schema) => schema['@type'] === 'Product') as Record<string, any>;

    expect(trip).toBeDefined();
    expect(trip.offers).toMatchObject({
      '@type': 'Offer',
      price: 1800,
      priceCurrency: 'USD',
      url: 'https://colombiatours.travel/paquetes/cartagena-tayrona-7-days',
      availability: 'https://schema.org/InStock',
    });
    expect(trip.organizer).toMatchObject({ '@type': 'TravelAgency', name: 'ColombiaTours' });
    expect(trip.itinerary.itemListElement).toHaveLength(2);

    expect(commercialProduct).toBeDefined();
    expect(commercialProduct.additionalType).toBe('https://schema.org/TouristTrip');
    expect(commercialProduct.offers.hasMerchantReturnPolicy).toMatchObject({
      '@type': 'MerchantReturnPolicy',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 15,
    });
    expect(commercialProduct.spatialCoverage).toEqual(
      expect.arrayContaining([expect.objectContaining({ '@type': 'Place', name: 'Cartagena' })])
    );
    expect(commercialProduct.aggregateRating).toBeUndefined();
  });

  it('omits Offer when price exists without a verifiable currency', () => {
    const product: ProductData = {
      id: 'act-001',
      name: 'Coffee tasting',
      slug: 'coffee-tasting',
      type: 'activity',
      description: 'Coffee experience in Colombia.',
      price: 120,
      image: 'https://example.com/activity.jpg',
    };

    const schemas = extractJsonLd(renderToStaticMarkup(
      <ProductSchema
        product={product}
        productType="activity"
        websiteUrl="https://colombiatours.travel/actividades/coffee-tasting"
        organizationName="ColombiaTours"
      />
    ));

    expect(schemas.find((schema) => schema['@type'] === 'Product')).toBeUndefined();
    const attraction = schemas.find((schema) => schema['@type'] === 'TouristAttraction') as Record<string, any>;
    expect(attraction).toBeDefined();
    expect(attraction.offers).toBeUndefined();
  });
});
