/**
 * Growth Console — Role helper stub.
 *
 * TODO(roles): merge with auth.ts when #405 lands. The full helper
 * (`requireGrowthRole`) is being built by a parallel agent; until that file
 * exists, every viewer is treated as 'viewer' (read-only). Approve / Reject
 * actions remain disabled in the UI and reject server-side.
 *
 * Refs:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Roles"
 *   - ADR-008 — Lane-Level Autonomy Gate
 */

export type GrowthRole = 'viewer' | 'curator' | 'admin';

export interface GrowthRoleContext {
  role: GrowthRole;
  accountId: string | null;
  userId: string | null;
}

/**
 * Stub: until #405 lands, return `viewer` for everyone. The caller MUST
 * still perform a tenant guard (account_id + website_id) — this helper does
 * not authenticate; it only assigns a role.
 */
export function getGrowthRoleStub(
  accountId: string | null,
  userId: string | null
): GrowthRoleContext {
  return { role: 'viewer', accountId, userId };
}

const ROLE_RANK: Record<GrowthRole, number> = {
  viewer: 0,
  curator: 1,
  admin: 2,
};

export function hasGrowthRole(actual: GrowthRole, required: GrowthRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}
