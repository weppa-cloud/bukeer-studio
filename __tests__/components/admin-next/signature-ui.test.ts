import { signatureStatusLabels, signatureToneForStatus } from '@/components/admin-next/signature-ui';

describe('Bukeer Signature UI state mapping', () => {
  it('maps agentic action states to visual tones', () => {
    expect(signatureToneForStatus('observed')).toBe('structural');
    expect(signatureToneForStatus('suggested')).toBe('live');
    expect(signatureToneForStatus('drafted')).toBe('live');
    expect(signatureToneForStatus('approval_required')).toBe('humanLoop');
    expect(signatureToneForStatus('blocked_missing_data')).toBe('danger');
    expect(signatureToneForStatus('blocked_policy')).toBe('danger');
    expect(signatureToneForStatus('expired')).toBe('warning');
    expect(signatureToneForStatus('approved')).toBe('success');
    expect(signatureToneForStatus('executed')).toBe('success');
  });

  it('keeps human-agent labels explicit', () => {
    expect(signatureStatusLabels.suggested).toBe('AI suggestion');
    expect(signatureStatusLabels.blocked_missing_data).toBe('AI blocked');
    expect(signatureStatusLabels.approval_required).toBe('Approval required');
  });
});
