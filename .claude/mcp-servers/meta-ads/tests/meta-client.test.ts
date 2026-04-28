import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';
import { createAppSecretProof, HttpMetaApiClient } from '../src/meta-client.js';

describe('meta client', () => {
  it('creates appsecret_proof', () => {
    expect(createAppSecretProof('token', 'secret')).toHaveLength(64);
  });

  it('adds appsecret proof and blocks absolute URLs', async () => {
    const config = loadConfig({ META_ACCESS_TOKEN_READ: 'read-token', META_APP_SECRET: 'app-secret', META_AD_ACCOUNT_ALLOWLIST: 'act_1' });
    let requested = '';
    const client = new HttpMetaApiClient(config, async (input) => {
      requested = String(input);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    await client.get('act_1/campaigns');
    expect(requested).toContain('appsecret_proof=');
    await expect(client.get('https://evil.test')).rejects.toThrow(/Absolute URLs/);
  });
});
