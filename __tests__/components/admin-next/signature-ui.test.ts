import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  SignatureUiStatePanel,
  signatureStatusLabels,
  signatureToneForStatus,
  signatureToneForUiState,
  signatureUiVariantDefaults,
} from '@/components/admin-next/signature-ui';
import {
  signatureUiStateFixtures,
  signatureUiStateOrder,
} from '@/lib/admin-next/fixtures/signature-ui-states';

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

  it('defines fixture variants for every requested signature UI state', () => {
    expect(signatureUiStateOrder).toEqual([
      'loading',
      'empty',
      'error',
      'no_permission',
      'approved',
      'rejected',
      'executing',
      'executed',
    ]);
    expect(signatureUiStateFixtures).toHaveLength(signatureUiStateOrder.length);

    for (const state of signatureUiStateOrder) {
      expect(signatureUiVariantDefaults[state].state).toBe(state);
      expect(signatureUiVariantDefaults[state].title).toEqual(expect.any(String));
      expect(signatureUiVariantDefaults[state].description).toEqual(expect.any(String));
      expect(signatureToneForUiState(state)).toBe(signatureUiVariantDefaults[state].tone);
    }
  });

  it('maps terminal and transient UI states to expected tones', () => {
    expect(signatureToneForUiState('loading')).toBe('live');
    expect(signatureToneForUiState('empty')).toBe('structural');
    expect(signatureToneForUiState('error')).toBe('danger');
    expect(signatureToneForUiState('no_permission')).toBe('danger');
    expect(signatureToneForUiState('approved')).toBe('success');
    expect(signatureToneForUiState('rejected')).toBe('danger');
    expect(signatureToneForUiState('executing')).toBe('live');
    expect(signatureToneForUiState('executed')).toBe('success');
  });

  it('renders a signature UI state panel from fixture data', () => {
    const variant = signatureUiVariantDefaults.no_permission;
    const markup = renderToStaticMarkup(
      createElement(SignatureUiStatePanel, {
        variant,
      })
    );

    expect(markup).toContain('data-signature-ui-state="no_permission"');
    expect(markup).toContain('Permission required');
    expect(markup).toContain('No permission');
  });
});
