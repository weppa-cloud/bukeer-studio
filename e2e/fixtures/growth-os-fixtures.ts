/**
 * Growth OS E2E fixtures (issue #441).
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
 * Role-aware auth uses Supabase fixture users. Keep this helper centralized so
 * role-gated Growth UI tests can switch between viewer/curator/admin sessions.
 */
import type { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

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

export const CANONICAL_LANE_LABELS: Record<CanonicalLane, string> = {
  orchestrator: 'Orchestrator',
  technical_remediation: 'Technical',
  transcreation: 'Transcreation',
  content_creator: 'Creator',
  content_curator: 'Curator',
};

/**
 * Canonical autonomous workboard columns. Mirrors WORKBOARD_COLUMNS from
 * `lib/growth/console/queries-workboard.ts` without importing app code into
 * Playwright fixtures.
 */
export const WORKBOARD_COLUMNS = [
  'triage',
  'ready',
  'running',
  'blocked',
  'review_needed',
  'auto_completed',
  'published_applied',
  'archived',
] as const;
export type WorkboardColumn = (typeof WORKBOARD_COLUMNS)[number];

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
    email:
      process.env.E2E_GROWTH_VIEWER_EMAIL ??
      'consultoria+growth-viewer@weppa.co',
  },
  curator: {
    role: 'curator',
    email:
      process.env.E2E_GROWTH_CURATOR_EMAIL ??
      'consultoria+growth-curator@weppa.co',
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
  return (
    process.env.E2E_GROWTH_ROLE_FIXTURES_READY === 'true' ||
    (!!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !!process.env.E2E_GROWTH_VIEWER_EMAIL &&
      !!process.env.E2E_GROWTH_CURATOR_EMAIL)
  );
}

export async function signInAs(
  page: Page,
  role: GrowthRole,
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase env for role-aware Growth E2E sign-in.');
  }
  const user = usersByRole[role];
  const password =
    process.env[`E2E_GROWTH_${role.toUpperCase()}_PASSWORD`] ??
    process.env.E2E_GROWTH_ROLE_PASSWORD ??
    process.env.E2E_USER_PASSWORD ??
    'Ingeniero1!';

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (error || !data.session) {
    throw new Error(
      `Could not sign in as Growth ${role}: ${error?.message ?? 'missing session'}`,
    );
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const currentUrl = page.url();
  const baseUrl =
    currentUrl && currentUrl !== 'about:blank'
      ? currentUrl
      : (process.env.PLAYWRIGHT_BASE_URL ??
        process.env.E2E_BASE_URL ??
        `http://localhost:${process.env.PORT ?? process.env.E2E_PORT ?? '3001'}`);
  const origin = new URL(baseUrl);
  const cookieValue = `base64-${Buffer.from(
    JSON.stringify(data.session),
  ).toString('base64url')}`;

  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
      value: cookieValue,
      url: origin.origin,
      expires: data.session.expires_at ?? Date.now() / 1000 + 3600,
      httpOnly: false,
      secure: origin.protocol === 'https:',
      sameSite: 'Lax',
    },
  ]);
}

/** Build the Growth console URL for a given tenant. */
export function growthConsoleUrl(tenant: GrowthTenantFixture): string {
  return `/dashboard/${tenant.websiteId}/growth`;
}
