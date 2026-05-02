/**
 * Growth Console — server-side role guard.
 *
 * SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Roles" defines five roles:
 *   viewer | growth_operator | curator | council_admin | account_admin
 *
 * MVP behavior (#405): we treat any authenticated user with access to the
 * website as `viewer`. Full role mapping (RLS-backed memberships, gate
 * enforcement) lands with #408 (Lane-Level Autonomy Gate).
 *
 * Refs:
 *   - ADR-003 (multi-tenant boundaries)
 *   - ADR-009 (account_id + website_id scoping)
 */

import 'server-only';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export type GrowthRole =
  | 'viewer'
  | 'growth_operator'
  | 'curator'
  | 'council_admin'
  | 'account_admin';

const ROLE_RANK: Record<GrowthRole, number> = {
  viewer: 0,
  growth_operator: 1,
  curator: 2,
  council_admin: 3,
  account_admin: 4,
};

export interface GrowthAuthContext {
  userId: string;
  accountId: string;
  websiteId: string;
  role: GrowthRole;
}

/**
 * Resolve the authenticated user, verify website membership via RLS-backed
 * select on `websites`, and return a tenant-scoped auth context.
 *
 * If the user is not authenticated → redirect('/login').
 * If the website is not visible to the session → redirect('/dashboard').
 *
 * TODO(roles): replace the static `viewer` assignment once the membership +
 * role-mapping table lands (#408). Until then this is a read-only console.
 */
export async function requireGrowthRole(
  websiteId: string,
  requiredRole: GrowthRole = 'viewer',
): Promise<GrowthAuthContext> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Tenant membership: if RLS denies access we get null/error here.
  const { data: website, error } = await supabase
    .from('websites')
    .select('id, account_id')
    .eq('id', websiteId)
    .maybeSingle();

  if (error || !website) {
    redirect('/dashboard');
  }

  // TODO(roles): look up the actual Growth role for (user, account, website)
  // from the membership table once it exists. For MVP every authenticated
  // member is a `viewer`; mutations are not implemented yet.
  const role: GrowthRole = 'viewer';

  if (ROLE_RANK[role] < ROLE_RANK[requiredRole]) {
    redirect('/dashboard');
  }

  return {
    userId: user.id,
    accountId: website.account_id as string,
    websiteId: website.id as string,
    role,
  };
}
