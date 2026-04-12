/**
 * Internal Link Graph — Orphan page detection
 *
 * Builds an inbound-link map for all known pages and identifies orphans
 * (pages with zero internal links pointing to them).
 */

export interface LinkGraphResult {
  /** slug → number of pages/sources linking to it */
  inboundCount: Map<string, number>;
  /** slugs with 0 inbound links */
  orphans: string[];
}

/**
 * Build an internal link graph and detect orphan pages.
 *
 * @param pages - All known pages (products, destinations, blog posts, etc.)
 * @param destinations - Destination pages with their associated product slugs
 * @param featuredProducts - Product slugs featured on the homepage
 * @param navLinks - Page slugs referenced from the navigation menu
 * @param blogInternalLinks - Blog posts with their internal link targets
 */
export function buildInternalLinkGraph(
  pages: Array<{ slug: string; type: string }>,
  destinations: Array<{ slug: string; products: string[] }>,
  featuredProducts: string[],
  navLinks: string[],
  blogInternalLinks: Array<{ slug: string; links: string[] }>,
): LinkGraphResult {
  // Initialize all pages with 0 inbound links
  const inboundCount = new Map<string, number>();
  for (const page of pages) {
    inboundCount.set(page.slug, 0);
  }

  const increment = (slug: string) => {
    if (inboundCount.has(slug)) {
      inboundCount.set(slug, inboundCount.get(slug)! + 1);
    }
  };

  // 1. Homepage featured products → those product slugs get a link
  for (const slug of featuredProducts) {
    increment(slug);
  }

  // 2. Destination detail pages → each destination's product slugs
  for (const dest of destinations) {
    for (const productSlug of dest.products) {
      increment(productSlug);
    }
  }

  // 3. Navigation menu → page slugs
  for (const slug of navLinks) {
    increment(slug);
  }

  // 4. Blog posts → their internal_links array
  for (const post of blogInternalLinks) {
    for (const targetSlug of post.links) {
      increment(targetSlug);
    }
  }

  // 5. Breadcrumbs: products link up to their category (destination)
  //    Each product page has a breadcrumb to its parent destination
  const productSlugs = new Set(
    pages.filter((p) => p.type === 'product').map((p) => p.slug),
  );
  for (const dest of destinations) {
    for (const productSlug of dest.products) {
      if (productSlugs.has(productSlug)) {
        // Product breadcrumb links to its destination category
        increment(dest.slug);
      }
    }
  }

  // 6. Category (destination) pages link to all their products
  //    (already covered by step 2, but destinations also link to home via breadcrumbs)
  //    Breadcrumb: product → category → home
  //    Home is typically "/" which may not be in the pages list — skip home increment
  //    Category breadcrumb to home is implicit (always present), not counted separately

  // Collect orphans
  const orphans: string[] = [];
  for (const [slug, count] of inboundCount) {
    if (count === 0) {
      orphans.push(slug);
    }
  }

  return { inboundCount, orphans };
}
