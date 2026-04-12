/**
 * Click Depth Calculator
 *
 * Uses BFS from homepage to determine how many clicks each page is from root.
 * Depth 0: Homepage
 * Depth 1: Pages linked directly from homepage (nav + sections)
 * Depth 2: Pages linked from depth-1 pages (e.g., /destinos/cartagena)
 * Depth 3: Pages reached via destination → product
 * Depth 4+: Deep chains (similar products, nested links)
 */

export interface ClickDepthResult {
  depths: Map<string, number>; // slug → clicks from homepage
  deep: string[]; // slugs with depth >= 4
}

/**
 * Calculate click depth for all reachable pages using BFS from homepage.
 *
 * @param homepageLinks - Slugs directly linked from homepage (nav items + featured sections)
 * @param destinationProducts - Map of destination slug → product slugs it links to
 * @param categoryProducts - Map of category slug → product slugs it links to
 */
export function calculateClickDepth(
  homepageLinks: string[],
  destinationProducts: Map<string, string[]>,
  categoryProducts: Map<string, string[]>,
): ClickDepthResult {
  const depths = new Map<string, number>();
  const queue: Array<{ slug: string; depth: number }> = [];

  // Homepage is depth 0 (not stored as a slug, but it's the origin)
  // All homepage links are depth 1
  for (const slug of homepageLinks) {
    if (!depths.has(slug)) {
      depths.set(slug, 1);
      queue.push({ slug, depth: 1 });
    }
  }

  // BFS traversal
  while (queue.length > 0) {
    const { slug, depth } = queue.shift()!;

    // Get children: pages linked from this slug
    const children: string[] = [];

    // If this slug is a destination, it links to its products
    const destProducts = destinationProducts.get(slug);
    if (destProducts) {
      children.push(...destProducts);
    }

    // If this slug is a category, it links to its products
    const catProducts = categoryProducts.get(slug);
    if (catProducts) {
      children.push(...catProducts);
    }

    // Enqueue unvisited children at depth + 1
    for (const child of children) {
      if (!depths.has(child)) {
        depths.set(child, depth + 1);
        queue.push({ slug: child, depth: depth + 1 });
      }
    }
  }

  // Collect deep pages (depth >= 4)
  const deep: string[] = [];
  for (const [slug, depth] of depths) {
    if (depth >= 4) {
      deep.push(slug);
    }
  }

  return { depths, deep };
}
