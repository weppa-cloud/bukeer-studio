/**
 * Auth helpers test — EDITOR_ROLES validation
 *
 * Verifies that hasEditorRole() accepts the correct roles
 * and rejects unauthorized ones.
 *
 * IMPORTANT: The spec says EDITOR_ROLES should NOT contain 'owner'
 * for security reasons. This test documents the CURRENT behavior
 * (which DOES include owner) and will flag when it changes.
 */

import { hasEditorRole } from '@/lib/ai/auth-helpers';

// ============================================================================
// Helper to create AuthContext
// ============================================================================

function makeAuth(role: string) {
  return {
    userId: 'test-user-001',
    accountId: 'test-account-001',
    role,
    token: 'test-token',
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('hasEditorRole', () => {
  describe('accepts authorized roles', () => {
    it('accepts super_admin', () => {
      expect(hasEditorRole(makeAuth('super_admin'))).toBe(true);
    });

    it('accepts admin', () => {
      expect(hasEditorRole(makeAuth('admin'))).toBe(true);
    });

    it('accepts agent', () => {
      expect(hasEditorRole(makeAuth('agent'))).toBe(true);
    });
  });

  describe('current behavior: owner is included', () => {
    it('currently accepts owner (EDITOR_ROLES includes owner)', () => {
      // NOTE: The spec for Issue #526 says EDITOR_ROLES should NOT contain 'owner'.
      // Current implementation DOES include it.
      // When this is fixed (F1 auth fix), change this test to:
      //   expect(hasEditorRole(makeAuth('owner'))).toBe(false);
      expect(hasEditorRole(makeAuth('owner'))).toBe(true);
    });
  });

  describe('rejects unauthorized roles', () => {
    it('rejects viewer', () => {
      expect(hasEditorRole(makeAuth('viewer'))).toBe(false);
    });

    it('rejects empty string', () => {
      expect(hasEditorRole(makeAuth(''))).toBe(false);
    });

    it('rejects random string', () => {
      expect(hasEditorRole(makeAuth('hacker'))).toBe(false);
    });

    it('rejects guest', () => {
      expect(hasEditorRole(makeAuth('guest'))).toBe(false);
    });

    it('rejects undefined-like values', () => {
      expect(hasEditorRole(makeAuth('undefined'))).toBe(false);
      expect(hasEditorRole(makeAuth('null'))).toBe(false);
    });
  });
});
