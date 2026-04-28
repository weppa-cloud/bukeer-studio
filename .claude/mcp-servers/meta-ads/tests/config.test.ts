import { describe, expect, it } from 'vitest';

import { isAccountAllowed, loadConfig, sanitizeSecrets } from '../src/config.js';

describe('config', () => {
  it('loads required config with normalized accounts', () => {
    const config = loadConfig({ META_ACCESS_TOKEN_READ: 'read-token', META_AD_ACCOUNT_ALLOWLIST: '123,act_456' });
    expect(config.mode).toBe('dry-run');
    expect(config.writesEnabled).toBe(false);
    expect(config.adAccountAllowlist).toEqual(['act_123', 'act_456']);
    expect(isAccountAllowed(config, '456')).toBe(true);
    expect(config.requestTimeoutMs).toBe(30000);
    expect(config.maxRetries).toBe(2);
    expect(config.rateLimitPerMinute).toBe(60);
  });

  it('requires read token', () => {
    expect(() => loadConfig({ META_AD_ACCOUNT_ALLOWLIST: 'act_1' })).toThrow(/META_ACCESS_TOKEN_READ/);
  });

  it('sanitizes secrets recursively', () => {
    expect(sanitizeSecrets({ accessToken: 'EAAB12345678901234567890', nested: { appSecret: 'x' } })).toEqual({
      accessToken: '[REDACTED]',
      nested: { appSecret: '[REDACTED]' },
    });
  });
});
