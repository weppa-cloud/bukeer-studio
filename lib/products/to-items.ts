import type { ProductData } from '@bukeer/website-contract';
import { formatPrice } from './format-price';

/**
 * Preserves backward-compatible signature (`string | undefined`) while delegating
 * to the unified `formatPrice` helper. Prefer `formatPrice` in new code.
 */
export function formatProductPrice(rawPrice: unknown, currency?: string): string | undefined {
  if (typeof rawPrice === 'string' && rawPrice.trim().length > 0) return rawPrice.trim();
  if (typeof rawPrice !== 'number' || Number.isNaN(rawPrice)) return undefined;

  // Default to USD only when caller didn't specify — matches legacy behavior.
  const code = currency?.toUpperCase() || 'USD';
  return formatPrice(rawPrice, code) ?? undefined;
}

export function toProductLocation(product: ProductData): string | undefined {
  if (product.location) return product.location;
  if (product.city && product.country) return `${product.city}, ${product.country}`;
  return product.city || product.country;
}

export function toDurationLabel(product: ProductData): string | undefined {
  const dynamicDuration = (product as unknown as { duration?: string }).duration;
  if (typeof dynamicDuration === 'string' && dynamicDuration.trim().length > 0) {
    return dynamicDuration.trim();
  }

  if (!product.duration_minutes || product.duration_minutes <= 0) return undefined;
  if (product.duration_minutes < 60) return `${product.duration_minutes} min`;
  return `${Math.max(1, Math.round(product.duration_minutes / 60))} h`;
}

export function toPackageItems(products: ProductData[], limit = 8): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  const items: Array<Record<string, unknown>> = [];
  for (const product of products) {
    if (!product.id || seen.has(product.id)) continue;
    seen.add(product.id);
    const featured = product.is_featured === true;
    const dbCategory = typeof (product as unknown as Record<string, unknown>).category === 'string'
      ? (product as unknown as Record<string, unknown>).category as string
      : undefined;
    const category = dbCategory || 'Popular';

    items.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image || product.images?.[0],
      destination: toProductLocation(product),
      duration: product.itinerary_items?.length ? `${product.itinerary_items.length} días` : toDurationLabel(product),
      price: formatProductPrice(product.price, product.currency),
      description: product.description,
      category,
      featured,
    });
  }
  return limit > 0 ? items.slice(0, limit) : items;
}

export function toActivityItems(products: ProductData[], limit = 8): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  const items: Array<Record<string, unknown>> = [];
  for (const product of products) {
    if (!product.id || seen.has(product.id)) continue;
    seen.add(product.id);
    items.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image || product.images?.[0],
      duration: toDurationLabel(product),
      price: formatProductPrice(product.price, product.currency),
      category: product.type === 'activity' ? 'Actividad' : 'Experiencia',
      location: toProductLocation(product),
      rating: product.rating,
      reviewCount: product.review_count,
      description: product.description,
      difficulty: product.duration_minutes && product.duration_minutes > 360 ? 'Intensa' : 'Fácil',
    });
  }
  return limit > 0 ? items.slice(0, limit) : items;
}

export function toHotelItems(products: ProductData[], limit = 8): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  const items: Array<Record<string, unknown>> = [];
  for (const product of products) {
    if (!product.id || seen.has(product.id)) continue;
    seen.add(product.id);
    items.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image || product.images?.[0],
      location: toProductLocation(product),
      rating: product.star_rating || undefined,
      reviewRating: product.rating,
      reviewCount: product.review_count,
      price: formatProductPrice(product.price, product.currency),
      badge: product.star_rating ? `${product.star_rating}★` : undefined,
    });
  }
  return limit > 0 ? items.slice(0, limit) : items;
}
