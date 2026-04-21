import { createClient } from '@supabase/supabase-js';
import type { FeaturedDestination } from '@bukeer/website-contract';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Editorial v1 — fetch curated featured destinations for a website.
 *
 * Source of truth: `destination_seo_overrides` rows with `is_featured = true`.
 * Ordered by `featured_order NULLS LAST`, limited to 4 entries (hero "Destino
 * del mes" + supporting cards).
 *
 * Returns `[]` on missing client, query error, or empty results. Consumers
 * should treat an empty list as "no featured destinations curated yet" and
 * gracefully fall back to the dynamic destinations list.
 */
export async function getFeaturedDestinations(
  websiteId: string,
  limit = 4,
): Promise<FeaturedDestination[]> {
  if (!supabase || !websiteId) return [];

  try {
    const { data, error } = await supabase
      .from('destination_seo_overrides')
      .select(
        'destination_slug, headline, tagline, hero_image_url, featured_order, custom_description, custom_seo_title',
      )
      .eq('website_id', websiteId)
      .eq('is_featured', true)
      .order('featured_order', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error('[getFeaturedDestinations] Query error:', error);
      return [];
    }
    if (!data) return [];

    return data.map((row) => ({
      slug: String(row.destination_slug),
      headline: row.headline ?? null,
      tagline: row.tagline ?? null,
      heroImageUrl: row.hero_image_url ?? null,
      featuredOrder:
        typeof row.featured_order === 'number' ? row.featured_order : null,
      customDescription: row.custom_description ?? null,
      customSeoTitle: row.custom_seo_title ?? null,
    }));
  } catch (e) {
    console.error('[getFeaturedDestinations] Exception:', e);
    return [];
  }
}
