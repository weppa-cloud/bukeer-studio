import { describe, expect, it } from 'vitest';

import { InMemoryApprovalStore } from '../src/approval.js';

describe('approval store', () => {
  it('accepts the same actor role tool and payload', () => {
    const store = new InMemoryApprovalStore();
    const payload = { name: 'Campaign', status: 'PAUSED' };
    const approval = store.issue({ actor: 'codex', role: 'operator', tool: 'meta_create_campaign', payload });
    expect(store.verify({ token: approval.approvalToken, actor: 'codex', role: 'operator', tool: 'meta_create_campaign', payload, confirm: true }).ok).toBe(true);
  });

  it('rejects changed payloads', () => {
    const store = new InMemoryApprovalStore();
    const approval = store.issue({ actor: 'codex', role: 'operator', tool: 'meta_create_campaign', payload: { name: 'A' } });
    expect(store.verify({ token: approval.approvalToken, actor: 'codex', role: 'operator', tool: 'meta_create_campaign', payload: { name: 'B' }, confirm: true }).ok).toBe(false);
  });
});
