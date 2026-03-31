/**
 * Tests for AI auth helpers.
 * Validates role checks, token extraction, and IP parsing.
 */

import { hasEditorRole, getClientIp, type AuthContext } from '@/lib/ai/auth-helpers';

// Mock next/server
jest.mock('next/server', () => ({
  NextRequest: class {
    headers: Map<string, string>;
    constructor() {
      this.headers = new Map();
    }
  },
}));

describe('hasEditorRole', () => {
  function makeAuth(role: string): AuthContext {
    return { userId: 'u1', accountId: 'a1', role, token: 'tok' };
  }

  it('allows super_admin', () => {
    expect(hasEditorRole(makeAuth('super_admin'))).toBe(true);
  });

  it('allows owner', () => {
    expect(hasEditorRole(makeAuth('owner'))).toBe(true);
  });

  it('allows admin', () => {
    expect(hasEditorRole(makeAuth('admin'))).toBe(true);
  });

  it('allows agent', () => {
    expect(hasEditorRole(makeAuth('agent'))).toBe(true);
  });

  it('denies unknown role', () => {
    expect(hasEditorRole(makeAuth('viewer'))).toBe(false);
  });

  it('denies empty role', () => {
    expect(hasEditorRole(makeAuth(''))).toBe(false);
  });

  it('denies accounting role', () => {
    expect(hasEditorRole(makeAuth('accounting'))).toBe(false);
  });
});

describe('getClientIp', () => {
  function makeRequest(headers: Record<string, string>) {
    return {
      headers: {
        get: (key: string) => headers[key] ?? null,
      },
    } as any;
  }

  it('extracts first IP from x-forwarded-for', () => {
    expect(getClientIp(makeRequest({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    expect(getClientIp(makeRequest({ 'x-real-ip': '10.0.0.1' }))).toBe('10.0.0.1');
  });

  it('returns unknown when no headers', () => {
    expect(getClientIp(makeRequest({}))).toBe('unknown');
  });

  it('trims whitespace from forwarded IP', () => {
    expect(getClientIp(makeRequest({ 'x-forwarded-for': '  1.2.3.4 , 5.6.7.8' }))).toBe('1.2.3.4');
  });
});
