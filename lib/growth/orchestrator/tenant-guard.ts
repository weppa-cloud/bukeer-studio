/**
 * Tenant Guard — runtime assertion that a returned row belongs to the
 * expected (account_id, website_id) pair before any mutation, tool call or
 * artifact write.
 *
 * Even though Postgres RLS already enforces tenant scoping at the DB layer,
 * this guard is a defence-in-depth check inside the orchestrator process:
 * service-role queries bypass RLS, so the runtime MUST re-assert scope after
 * every read.
 *
 * Refs:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Security And Multi-Tenant Rules"
 *   - ADR-003 (multi-tenant)
 *   - ADR-009 (tenant guard / RLS scoping)
 */

import type { TenantScope } from './types';

export class TenantScopeViolationError extends Error {
  readonly expected: TenantScope;
  readonly actual: Partial<TenantScope>;

  constructor(expected: TenantScope, actual: Partial<TenantScope>) {
    super(
      `Tenant scope violation: expected account_id=${expected.account_id} ` +
        `website_id=${expected.website_id}, got ` +
        `account_id=${actual.account_id ?? '<missing>'} ` +
        `website_id=${actual.website_id ?? '<missing>'}`,
    );
    this.name = 'TenantScopeViolationError';
    this.expected = expected;
    this.actual = actual;
  }
}

/**
 * Throws TenantScopeViolationError if `actual` doesn't match `expected`
 * exactly on both `account_id` and `website_id`. Pure function — no I/O.
 *
 * Use this wherever the orchestrator receives a row from Supabase before
 * acting on it (claim, event write, status update, artifact emit).
 */
export function assertTenantScope(
  expected: TenantScope,
  actual: Partial<TenantScope> | null | undefined,
): void {
  if (
    actual == null ||
    actual.account_id !== expected.account_id ||
    actual.website_id !== expected.website_id
  ) {
    throw new TenantScopeViolationError(expected, actual ?? {});
  }
}
