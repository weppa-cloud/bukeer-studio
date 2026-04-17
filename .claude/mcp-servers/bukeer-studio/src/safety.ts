/**
 * Safety guardrails for Supabase-direct mutations.
 *
 * Truth-field denylist: these columns are owned by Flutter-admin / backend-dev
 * truth tables (hotels, activities, package_kits, destinations, transfers).
 * SEO tools must never write them via blog/page upsert paths.
 */

export const TRUTH_FIELD_DENYLIST = new Set<string>([
  // Core descriptive fields shared by hotels/activities/packages/destinations
  'name',
  'description',
  'price',
  'main_image',
  'star_rating',
  'user_rating',
  'amenities',
  'duration_minutes',
  'inclutions',
  'exclutions',
  'recomendations',
  'experience_type',
  // Pricing + inventory
  'currency',
  'base_price',
  'net_price',
  'total_price',
  'availability',
  // FK ownership
  'account_id',
  'hotel_id',
  'activity_id',
  'destination_id',
  'package_kit_id',
  'product_id',
]);

export class TruthFieldBlocked extends Error {
  public readonly code = 'SEO_TRUTH_FIELD_BLOCKED';
  public readonly offendingFields: string[];
  constructor(offendingFields: string[]) {
    super(
      `Blocked: payload contains truth-table columns owned by backend-dev. Offending fields: ${offendingFields.join(', ')}`,
    );
    this.offendingFields = offendingFields;
  }
}

/**
 * Throws TruthFieldBlocked if `record` has any key in the denylist.
 *
 * Unit verification (run manually; no full test suite in v1):
 *
 *   import { assertNoTruthFields, TruthFieldBlocked } from './safety.js';
 *   try { assertNoTruthFields({ slug: 'x', name: 'hotel' }); }
 *   catch (e) {
 *     console.assert(e instanceof TruthFieldBlocked);
 *     console.assert(e.offendingFields.includes('name'));
 *   }
 *   assertNoTruthFields({ slug: 'x', title: 'post' }); // should not throw
 */
export function assertNoTruthFields(record: Record<string, unknown>): void {
  const offending: string[] = [];
  for (const key of Object.keys(record)) {
    if (TRUTH_FIELD_DENYLIST.has(key)) offending.push(key);
  }
  if (offending.length > 0) {
    throw new TruthFieldBlocked(offending);
  }
}
