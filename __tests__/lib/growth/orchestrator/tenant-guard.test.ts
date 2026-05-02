/**
 * Tests for the tenant scope guard. Pure unit — no Supabase / network.
 *
 * Refs: SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Security And Multi-Tenant Rules"
 */

import {
  assertTenantScope,
  TenantScopeViolationError,
} from '@/lib/growth/orchestrator/tenant-guard';

const ACCOUNT_A = '11111111-1111-1111-1111-111111111111';
const ACCOUNT_B = '22222222-2222-2222-2222-222222222222';
const SITE_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SITE_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('assertTenantScope', () => {
  it('passes when account_id and website_id both match', () => {
    expect(() =>
      assertTenantScope(
        { account_id: ACCOUNT_A, website_id: SITE_A },
        { account_id: ACCOUNT_A, website_id: SITE_A },
      ),
    ).not.toThrow();
  });

  it('throws TenantScopeViolationError when account_id differs', () => {
    expect(() =>
      assertTenantScope(
        { account_id: ACCOUNT_A, website_id: SITE_A },
        { account_id: ACCOUNT_B, website_id: SITE_A },
      ),
    ).toThrow(TenantScopeViolationError);
  });

  it('throws when website_id differs even if account matches', () => {
    expect(() =>
      assertTenantScope(
        { account_id: ACCOUNT_A, website_id: SITE_A },
        { account_id: ACCOUNT_A, website_id: SITE_B },
      ),
    ).toThrow(TenantScopeViolationError);
  });

  it('throws when actual is null or undefined', () => {
    expect(() =>
      assertTenantScope({ account_id: ACCOUNT_A, website_id: SITE_A }, null),
    ).toThrow(TenantScopeViolationError);
    expect(() =>
      assertTenantScope(
        { account_id: ACCOUNT_A, website_id: SITE_A },
        undefined,
      ),
    ).toThrow(TenantScopeViolationError);
  });

  it('throws when actual is missing one of the keys', () => {
    expect(() =>
      assertTenantScope(
        { account_id: ACCOUNT_A, website_id: SITE_A },
        { account_id: ACCOUNT_A },
      ),
    ).toThrow(TenantScopeViolationError);
  });

  it('error carries expected and actual scopes for observability', () => {
    let caught: unknown;
    try {
      assertTenantScope(
        { account_id: ACCOUNT_A, website_id: SITE_A },
        { account_id: ACCOUNT_B, website_id: SITE_B },
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TenantScopeViolationError);
    const tsv = caught as TenantScopeViolationError;
    expect(tsv.expected.account_id).toBe(ACCOUNT_A);
    expect(tsv.actual.website_id).toBe(SITE_B);
    expect(tsv.message).toMatch(/Tenant scope violation/);
  });
});
