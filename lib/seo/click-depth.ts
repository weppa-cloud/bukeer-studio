/**
 * Click Depth Calculator
 *
 * Uses BFS from homepage to determine how many clicks each item is from root.
 * Depth 0: Homepage
 * Depth 1: Items in nav + homepage featured products/destinations
 * Depth 2: Items on destination pages (products associated with a destination)
 * Depth 3+: Items only reachable via deeper navigation chains
 *
 * Works with item IDs to match the SEO dashboard's ScoredItem model.
 */

export interface ClickDepthResult {
  /** itemId → clicks from homepage */
  depths: Map<string, number>;
  /** itemIds with depth >= 4 */
  deep: string[];
  /** itemIds not reachable from homepage at all */
  unreachable: string[];
}

/**
 * Calculate click depth for all items using BFS from homepage.
 *
 * @param allItemIds - All item IDs in the dashboard
 * @param homepageLinkedIds - IDs directly linked from homepage (featured products + featured destinations)
 * @param navLinkedIds - IDs reachable from navigation menu
 * @param destinationProductMap - destinationId → productIds visible on that destination page
 */
export function calculateClickDepth(
  allItemIds: string[],
  homepageLinkedIds: string[],
  navLinkedIds: string[],
  destinationProductMap: Map<string, string[]>,
): ClickDepthResult {
  const depths = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = [];

  // Depth 1: Everything directly linked from homepage or nav
  const depth1Ids = new Set([...homepageLinkedIds, ...navLinkedIds]);
  for (const id of depth1Ids) {
    if (!depths.has(id)) {
      depths.set(id, 1);
      queue.push({ id, depth: 1 });
    }
  }

  // BFS traversal
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;

    // If this is a destination, it links to its products (depth + 1)
    const products = destinationProductMap.get(id);
    if (products) {
      for (const productId of products) {
        if (!depths.has(productId)) {
          depths.set(productId, depth + 1);
          queue.push({ id: productId, depth: depth + 1 });
        }
      }
    }
  }

  // Collect deep items (depth >= 4) and unreachable items
  const deep: string[] = [];
  const unreachable: string[] = [];
  const allSet = new Set(allItemIds);

  for (const [id, depth] of depths) {
    if (depth >= 4) {
      deep.push(id);
    }
  }

  for (const id of allSet) {
    if (!depths.has(id)) {
      unreachable.push(id);
    }
  }

  return { depths, deep, unreachable };
}
