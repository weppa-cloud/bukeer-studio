/**
 * Internal Link Graph — Orphan page detection
 *
 * Builds an inbound-link map for all known items and identifies orphans
 * (items with zero internal links pointing to them).
 *
 * Works with item IDs to match the SEO dashboard's ScoredItem model.
 */

export interface LinkGraphResult {
  /** itemId → number of sources linking to it */
  inboundCount: Map<string, number>;
  /** itemIds with 0 inbound links */
  orphans: string[];
}

export interface LinkGraphItem {
  id: string;
  slug: string;
  type: string;
  name: string;
}

/**
 * Build an internal link graph and detect orphan pages.
 *
 * Sources of inbound links:
 * 1. Featured products on the homepage (from websites.featured_products)
 * 2. Products associated with a destination (destination → product mapping)
 * 3. Navigation menu links (page slugs in the nav)
 * 4. Blog posts referencing items (future — currently not extracted)
 *
 * @param items - All scored items in the dashboard
 * @param featuredProductIds - Product IDs featured on homepage sections
 * @param destinationProductMap - destinationId → productIds visible on that destination page
 * @param navSlugs - Slugs referenced from the navigation menu
 */
export function buildInternalLinkGraph(
  items: LinkGraphItem[],
  featuredProductIds: string[],
  destinationProductMap: Map<string, string[]>,
  navSlugs: string[],
): LinkGraphResult {
  // Initialize all items with 0 inbound links
  const inboundCount = new Map<string, number>();
  for (const item of items) {
    inboundCount.set(item.id, 0);
  }

  // Build a slug → id lookup for nav matching
  const slugToId = new Map<string, string>();
  for (const item of items) {
    if (item.slug) {
      slugToId.set(item.slug, item.id);
    }
  }

  const increment = (id: string) => {
    if (inboundCount.has(id)) {
      inboundCount.set(id, inboundCount.get(id)! + 1);
    }
  };

  // 1. Homepage featured products → direct link from homepage
  const featuredSet = new Set(featuredProductIds);
  for (const id of featuredSet) {
    increment(id);
  }

  // 2. Destination pages → products associated with that destination
  for (const [destId, productIds] of destinationProductMap) {
    // The destination page itself gets a link if it's featured or in nav
    // (handled by steps 1 and 3). Here we count products linked FROM destinations.
    for (const productId of productIds) {
      increment(productId);
    }
    // Products on a destination page also provide a breadcrumb back to the destination
    if (productIds.length > 0) {
      increment(destId);
    }
  }

  // 3. Navigation menu → match slugs to item IDs
  for (const slug of navSlugs) {
    const id = slugToId.get(slug);
    if (id) {
      increment(id);
    }
  }

  // Collect orphans (items with 0 inbound links)
  const orphans: string[] = [];
  for (const [id, count] of inboundCount) {
    if (count === 0) {
      orphans.push(id);
    }
  }

  return { inboundCount, orphans };
}
