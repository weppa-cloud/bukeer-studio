import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

/**
 * Minimal shape for the editorial-v1 planner-detail "Otros paquetes que arma"
 * grid + signature trip card. Strict subset of package_kits columns that the
 * UI can render without a full ProductData round-trip.
 */
export interface PlannerPackageSummary {
  id: string;
  slug: string;
  title: string;
  destination: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
}

const DEFAULT_LIMIT = 6;

/**
 * Fetch package_kits authored by a single planner.
 *
 * Uses the planner_id FK added in migration
 * `20260504110000_planner_id_on_package_kits.sql`. Returns a compact list
 * (limited by `limit`) ordered by featured first, then most recently updated.
 *
 * Filters:
 *  - account_id match (defense in depth vs cross-account leakage even though
 *    planner_id is unique per contact).
 *  - status IN ('active','published') — catalog uses 'active' today; accept
 *    either so future status migration is non-breaking.
 *
 * Returns [] on error or when the planner has no packages (ghost-pattern
 * caller hides the section).
 */
export async function getPlannerPackages(
  accountId: string,
  plannerId: string,
  limit: number = DEFAULT_LIMIT,
): Promise<PlannerPackageSummary[]> {
  if (!accountId || !plannerId) return [];

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from('package_kits')
    .select('id, name, slug, destination, cover_image_url, is_featured, status, updated_at')
    .eq('account_id', accountId)
    .eq('planner_id', plannerId)
    .in('status', ['active', 'published'])
    .order('is_featured', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.name,
    destination: row.destination ?? null,
    coverImageUrl: row.cover_image_url ?? null,
    isFeatured: Boolean(row.is_featured),
  }));
}

/**
 * Fetch a single package_kit by id (used to hydrate the planner's signature
 * trip card from `contacts.signature_package_id`).
 */
export async function getPackageKitById(
  accountId: string,
  packageKitId: string,
): Promise<PlannerPackageSummary | null> {
  if (!accountId || !packageKitId) return null;

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from('package_kits')
    .select('id, name, slug, destination, cover_image_url, is_featured')
    .eq('account_id', accountId)
    .eq('id', packageKitId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    slug: data.slug,
    title: data.name,
    destination: data.destination ?? null,
    coverImageUrl: data.cover_image_url ?? null,
    isFeatured: Boolean(data.is_featured),
  };
}
