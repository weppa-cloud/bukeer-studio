/**
 * Growth Console — server-side role guard.
 *
 * SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Roles" defines five Growth roles:
 *   viewer | growth_operator | curator | council_admin | account_admin
 *
 * Until Growth has its own membership table, we map the existing app's
 * `user_roles → roles.role_name` (used by `lib/admin/user-context.ts`) and
 * `global_admins.is_active` onto the Growth role ladder. The mapping is
 * intentionally conservative: anything that doesn't match an explicit growth
 * role falls back to `viewer` for an authenticated tenant member, or kicks
 * the user out otherwise.
 *
 * Refs:
 *   - lib/admin/user-context.ts (existing role lookup)
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Roles"
 *   - ADR-003 (multi-tenant boundaries)
 *   - ADR-009 (account_id + website_id scoping)
 */

import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export type GrowthRole =
  | "viewer"
  | "growth_operator"
  | "curator"
  | "council_admin"
  | "account_admin";

const ROLE_RANK: Record<GrowthRole, number> = {
  viewer: 0,
  growth_operator: 1,
  curator: 2,
  council_admin: 3,
  account_admin: 4,
};

export function hasGrowthRole(
  actual: GrowthRole,
  required: GrowthRole,
): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export interface GrowthAuthContext {
  userId: string;
  accountId: string;
  websiteId: string;
  role: GrowthRole;
  /** Set when the user is a platform-level Bukeer admin (global_admins.is_active=true). */
  isPlatformAdmin: boolean;
}

interface UserRoleJoin {
  account_id: string | null;
  roles:
    | { role_name?: string | null }
    | Array<{ role_name?: string | null }>
    | null;
}

interface GlobalAdminRow {
  user_id: string;
  is_active: boolean | null;
  role: string | null;
}

/**
 * Map an app role name (or growth-specific role override) into the Growth
 * role enum. Unknown values fall back to `viewer`.
 *
 * Recognised app aliases:
 *   - admin / owner / agency_admin → account_admin
 *   - manager / supervisor         → council_admin
 *   - editor / curator / qa        → curator
 *   - operator / planner / agent   → growth_operator
 *
 * Recognised exact growth roles (already in the enum) pass through.
 */
function mapAppRoleToGrowthRole(roleName: string | null): GrowthRole {
  if (!roleName) return "viewer";
  const normalized = roleName.trim().toLowerCase();
  if (
    normalized === "viewer" ||
    normalized === "growth_operator" ||
    normalized === "curator" ||
    normalized === "council_admin" ||
    normalized === "account_admin"
  ) {
    return normalized;
  }
  if (
    normalized === "admin" ||
    normalized === "owner" ||
    normalized === "agency_admin" ||
    normalized === "super_admin"
  ) {
    return "account_admin";
  }
  if (
    normalized === "manager" ||
    normalized === "supervisor" ||
    normalized === "council"
  ) {
    return "council_admin";
  }
  if (
    normalized === "editor" ||
    normalized === "qa" ||
    normalized === "reviewer"
  ) {
    return "curator";
  }
  if (
    normalized === "operator" ||
    normalized === "planner" ||
    normalized === "agent"
  ) {
    return "growth_operator";
  }
  return "viewer";
}

function extractRoleName(value: UserRoleJoin["roles"]): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0]?.role_name ?? null;
  }
  return value.role_name ?? null;
}

/**
 * Resolve the authenticated user, verify website membership, and return a
 * tenant-scoped Growth auth context with the resolved role.
 *
 * Behaviour on failure:
 *   - No session → redirect('/login').
 *   - Website not visible to session (RLS) → redirect('/dashboard').
 *   - Resolved role rank below `requiredRole` → redirect('/dashboard').
 *
 * Lookup order:
 *   1. `global_admins` (is_active=true) → `account_admin` regardless of tenant.
 *   2. `user_roles` joined to `roles.role_name` filtered to the website's
 *      `account_id` → mapped via `mapAppRoleToGrowthRole`.
 *   3. Fallback: any authenticated tenant member (visible website) → `viewer`.
 */
export async function requireGrowthRole(
  websiteId: string,
  requiredRole: GrowthRole = "viewer",
): Promise<GrowthAuthContext> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Tenant membership: RLS-scoped websites read.
  const { data: website, error: websiteErr } = await supabase
    .from("websites")
    .select("id, account_id")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteErr || !website) {
    redirect("/dashboard");
  }

  const accountId = website.account_id as string;

  // 1) Platform admin?
  const { data: globalRow } = await supabase
    .from("global_admins")
    .select("user_id, is_active, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle<GlobalAdminRow>();

  let role: GrowthRole;
  if (globalRow?.is_active) {
    role = "account_admin";
  } else {
    // 2) Tenant-scoped role lookup.
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("account_id, roles(role_name)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .eq("account_id", accountId)
      .limit(5)
      .returns<UserRoleJoin[]>();

    const matched = roleRows?.find((row) => row.account_id === accountId);
    const appRole = matched ? extractRoleName(matched.roles) : null;
    role = appRole
      ? mapAppRoleToGrowthRole(appRole)
      : // 3) Fallback for tenant members without an explicit role row.
        "viewer";
  }

  if (ROLE_RANK[role] < ROLE_RANK[requiredRole]) {
    redirect("/dashboard");
  }

  return {
    userId: user.id,
    accountId,
    websiteId: website.id as string,
    role,
    isPlatformAdmin: !!globalRow?.is_active,
  };
}
