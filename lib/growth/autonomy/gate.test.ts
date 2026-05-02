import { evaluateGate, type GateInput } from './gate';
import type { LaneAgreement } from './lane-agreement';

/**
 * Unit tests for the Lane-Level Autonomy Gate (#408).
 *
 * NOTE: jest.config.js restricts `roots` to `<rootDir>/__tests__`, so this
 * colocated file is mirrored at `__tests__/lib/growth/autonomy/gate.test.ts`
 * for discovery. This file is the canonical source — the mirror imports
 * directly from the same module under test.
 */

const POLICY = '2026-05-01';

function makeAgreement(overrides: Partial<LaneAgreement> = {}): LaneAgreement {
  return {
    account_id: 'acct-pilot',
    website_id: 'web-pilot',
    lane: 'technical_remediation',
    agreement: 0.95,
    policy_version: POLICY,
    computed_at: '2026-05-01T00:00:00.000Z',
    sample_size: 100,
    window_start: '2026-04-01T00:00:00.000Z',
    window_end: '2026-05-01T00:00:00.000Z',
    ai_human_disagreements: [],
    ...overrides,
  };
}

function makeInput(overrides: Partial<GateInput> = {}): GateInput {
  return {
    accountId: 'acct-pilot',
    websiteId: 'web-pilot',
    lane: 'technical_remediation',
    actionClass: 'safe_apply',
    laneAgreement: makeAgreement(),
    policyVersion: POLICY,
    smokePass: true,
    tenantAutoApplyEnabled: true,
    ...overrides,
  };
}

describe('evaluateGate — Lane-Level Autonomy Gate (#408)', () => {
  it('allows safe_apply when ALL conditions pass', () => {
    const out = evaluateGate(makeInput());
    expect(out.allowed).toBe(true);
    expect(out.reason).toBe('allowed');
    expect(out.requiredApproval).toBe('none');
  });

  it('denies safe_apply when agreement = 0.85 (< 0.90 threshold)', () => {
    const out = evaluateGate(
      makeInput({ laneAgreement: makeAgreement({ agreement: 0.85 }) }),
    );
    expect(out.allowed).toBe(false);
    expect(out.reason).toBe('agreement_below_threshold');
    expect(out.requiredApproval).toBe('curator');
  });

  it('denies safe_apply when policy_version mismatch', () => {
    const out = evaluateGate(
      makeInput({
        laneAgreement: makeAgreement({ policy_version: '2026-04-01' }),
      }),
    );
    expect(out.allowed).toBe(false);
    expect(out.reason).toBe('policy_version_mismatch');
    expect(out.requiredApproval).toBe('curator');
  });

  it('denies safe_apply when tenant kill switch off', () => {
    const out = evaluateGate(makeInput({ tenantAutoApplyEnabled: false }));
    expect(out.allowed).toBe(false);
    expect(out.reason).toBe('tenant_kill_switch_off');
    expect(out.requiredApproval).toBe('curator');
  });

  it('denies safe_apply when smoke contract failed', () => {
    const out = evaluateGate(makeInput({ smokePass: false }));
    expect(out.allowed).toBe(false);
    expect(out.reason).toBe('smoke_failed');
    expect(out.requiredApproval).toBe('curator');
  });

  it('paid_mutation always requires council, even at agreement = 1.0', () => {
    const out = evaluateGate(
      makeInput({
        actionClass: 'paid_mutation',
        laneAgreement: makeAgreement({ agreement: 1.0 }),
      }),
    );
    expect(out.allowed).toBe(false);
    expect(out.reason).toBe('action_class_always_gated');
    expect(out.requiredApproval).toBe('council');
  });

  it('experiment_activation always requires council', () => {
    const out = evaluateGate(
      makeInput({
        actionClass: 'experiment_activation',
        laneAgreement: makeAgreement({ agreement: 1.0 }),
      }),
    );
    expect(out.allowed).toBe(false);
    expect(out.requiredApproval).toBe('council');
  });

  it('content_publish always requires curator', () => {
    const out = evaluateGate(
      makeInput({
        actionClass: 'content_publish',
        laneAgreement: makeAgreement({ agreement: 1.0 }),
      }),
    );
    expect(out.allowed).toBe(false);
    expect(out.reason).toBe('action_class_always_gated');
    expect(out.requiredApproval).toBe('curator');
  });

  it('transcreation_merge always requires curator', () => {
    const out = evaluateGate(
      makeInput({
        actionClass: 'transcreation_merge',
        laneAgreement: makeAgreement({ agreement: 1.0 }),
      }),
    );
    expect(out.allowed).toBe(false);
    expect(out.requiredApproval).toBe('curator');
  });

  it('outreach_send always requires curator', () => {
    const out = evaluateGate(
      makeInput({
        actionClass: 'outreach_send',
        laneAgreement: makeAgreement({ agreement: 1.0 }),
      }),
    );
    expect(out.allowed).toBe(false);
    expect(out.requiredApproval).toBe('curator');
  });

  it('prepare is always allowed (no mutation surface)', () => {
    const out = evaluateGate(
      makeInput({ actionClass: 'prepare', laneAgreement: null }),
    );
    expect(out.allowed).toBe(true);
    expect(out.reason).toBe('allowed');
    expect(out.requiredApproval).toBe('none');
  });

  it('observe is always allowed (read-only)', () => {
    const out = evaluateGate(
      makeInput({ actionClass: 'observe', laneAgreement: null }),
    );
    expect(out.allowed).toBe(true);
    expect(out.reason).toBe('allowed');
  });

  it('null lane agreement → safe_apply denied with agreement_below_threshold', () => {
    const out = evaluateGate(makeInput({ laneAgreement: null }));
    expect(out.allowed).toBe(false);
    expect(out.reason).toBe('agreement_below_threshold');
    expect(out.requiredApproval).toBe('curator');
  });
});
