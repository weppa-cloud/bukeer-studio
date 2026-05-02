/**
 * Growth OS E2E fixtures (issue #409).
 *
 * Provides tenant + role placeholders for the Growth OS console UI contract.
 * The fixtures are intentionally lightweight: the spec is gated behind
 * GROWTH_OS_UI_E2E_ENABLED, so when the migrations / seed data / auth helpers
 * are not yet in place locally, the spec skips entirely.
 *
 * TODO(seed): replace placeholder UUIDs once the Growth OS migration lands and
 * a deterministic seed for tenants A and B is published. Until then, callers
 * should override via env (E2E_GROWTH_TENANT_A_WEBSITE_ID, etc.).
 *
 * TODO(auth-fixture): wire signInAs() to the real role-aware auth helper once
 * Studio exposes role switching for the four canonical roles. The current
 * implementation reuses the global `auth.setup.ts` storage state, so role
 * gating is asserted via UI affordances, not by re-authenticating.
 */
import type { Page } from '@playwright/test';

export type GrowthRole =
  | 'viewer'
  | 'curator'
  | 'council_admin'
  | 'account_admin';

export interface GrowthTenantFixture {
  /** Stable handle for logs / report output. */
  key: 'tenantA' | 'tenantB';
  /** Website / tenant id used in `/dashboard/[websiteId]/growth`. */
  websiteId: string;
  /** Human-readable label for assertion messages. */
  label: string;
}

/**
 * Canonical Agent Lanes (V1) — must mirror AgentLaneSchema in
 * `@bukeer/website-contract` (`growth-agent-definitions.ts`).
 *
 * The Lane status table on the Overview tab MUST render exactly these 5 rows.
 */
export const CANONICAL_LANES = [
  'orchestrator',
  'technical_remediation',
  'transcreation',
  'content_creator',
  'content_curator',
] as const;
export type CanonicalLane = (typeof CANONICAL_LANES)[number];

// TODO(seed): Replace with real Growth OS-seeded tenants once the migration is
// applied locally. The default for tenantA mirrors the COLOMBIATOURS pilot
// website; tenantB is a placeholder UUID that intentionally does NOT match
// the authenticated user's tenant scope so the cross-tenant guard test can
// assert the negative case.
export const tenantA: GrowthTenantFixture = {
  key: 'tenantA',
  websiteId:
    process.env.E2E_GROWTH_TENANT_A_WEBSITE_ID ??
    process.env.E2E_WEBSITE_ID ??
    '894545b7-73ca-4dae-b76a-da5b6a3f8441',
  label: 'Tenant A (ColombiaTours pilot)',
};

export const tenantB: GrowthTenantFixture = {
  key: 'tenantB',
  websiteId:
    process.env.E2E_GROWTH_TENANT_B_WEBSITE_ID ??
    '00000000-0000-4000-8000-00000000b002',
  label: 'Tenant B (cross-tenant guard placeholder)',
};

export interface GrowthUserFixture {
  role: GrowthRole;
  email: string;
  /** Optional storage state path; falls back to global auth state. */
  storageStatePath?: string;
}

// TODO(auth-fixture): replace with role-aware fixtures once Studio supports
// runtime role switching. The strings below are placeholders that drive
// telemetry / assertion messages but do not currently re-auth.
export const usersByRole: Record<GrowthRole, GrowthUserFixture> = {
  viewer: {
    role: 'viewer',
    email: process.env.E2E_GROWTH_VIEWER_EMAIL ?? 'viewer@bukeer.test',
  },
  curator: {
    role: 'curator',
    email: process.env.E2E_GROWTH_CURATOR_EMAIL ?? 'curator@bukeer.test',
  },
  council_admin: {
    role: 'council_admin',
    email:
      process.env.E2E_GROWTH_COUNCIL_ADMIN_EMAIL ??
      'council-admin@bukeer.test',
  },
  account_admin: {
    role: 'account_admin',
    email:
      process.env.E2E_GROWTH_ACCOUNT_ADMIN_EMAIL ??
      'account-admin@bukeer.test',
  },
};

/**
 * Returns whether the current environment is fully provisioned for the role-
 * gated test cases. When false, role-gated assertions should soft-skip rather
 * than fail — the env flag GROWTH_OS_UI_E2E_ENABLED gates the whole suite, but
 * within the suite some tests need additional auth fixtures to be meaningful.
 */
export function rolesProvisioned(): boolean {
  return process.env.E2E_GROWTH_ROLE_FIXTURES_READY === 'true';
}

/**
 * Stub for future role-aware sign-in. Today this is a no-op and tests rely on
 * the global storage state established by `e2e/setup/auth.setup.ts`. When the
 * harness gains role switching, route through here so call sites do not change.
 */
// TODO(auth-fixture): implement role-aware sign-in.
export async function signInAs(
  _page: Page,
  _role: GrowthRole,
): Promise<void> {
  // Intentional no-op until role fixtures are provisioned.
  return;
}

/** Build the Growth console URL for a given tenant. */
export function growthConsoleUrl(tenant: GrowthTenantFixture): string {
  return `/dashboard/${tenant.websiteId}/growth`;
}
