import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  type BukeerDraftAction,
  SignatureDraftActionPanel,
  SignatureUiStatePanel,
  SignatureWhatsAppHandoffStatus,
  signatureStatusLabels,
  signatureToneForDraftActionStatus,
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

  it('maps draft action statuses to safe review tones', () => {
    expect(signatureToneForDraftActionStatus('drafted')).toBe('live');
    expect(signatureToneForDraftActionStatus('review_required')).toBe('humanLoop');
    expect(signatureToneForDraftActionStatus('blocked_policy')).toBe('danger');
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

  it('renders Bukeer draft actions with editable fields and explicit safety copy', () => {
    const draftAction: BukeerDraftAction = {
      id: 'draft-missing-data-whatsapp',
      kind: 'manual_whatsapp_handoff',
      draftType: 'missing_data_message',
      title: 'WhatsApp missing-data request',
      status: 'review_required',
      traceId: 'trace-cartagena-003',
      requiredHumanAction: 'Planner must review tone and passenger fields before sending.',
      editableFields: [
        {
          id: 'field-message',
          label: 'Message body',
          proposedValue: 'Please confirm children ages and passport names.',
          required: true,
        },
        {
          id: 'field-channel',
          label: 'Channel',
          value: 'WhatsApp',
        },
      ],
    };

    const markup = renderToStaticMarkup(
      createElement(SignatureDraftActionPanel, {
        draftActions: [draftAction],
        onInspectTrace: () => undefined,
        onSimulate: () => undefined,
      })
    );

    expect(markup).toContain('Bukeer DraftAction review');
    expect(markup).toContain('Missing Data Message');
    expect(markup).toContain('Review Required');
    expect(markup).toContain('Message body');
    expect(markup).toContain('Please confirm children ages and passport names.');
    expect(markup).toContain('Planner must review tone and passenger fields before sending.');
    expect(markup).toContain('Inspect trace');
    expect(markup).toContain('Safety boundary: not sent, not reserved, not paid, not confirmed.');
    expect(markup).toContain('Review locally');
    expect(markup).toContain('Edit locally');
    expect(markup).toContain('Discard locally');
    expect(markup).not.toContain('Create WhatsApp handoff');
  });

  it('renders the WhatsApp handoff CTA only when enabled by a handler', () => {
    const draftAction: BukeerDraftAction = {
      id: 'draft-missing-data-whatsapp',
      kind: 'manual_whatsapp_handoff',
      draftType: 'missing_data_message',
      title: 'WhatsApp missing-data request',
      status: 'review_required',
      traceId: 'trace-cartagena-003',
      requiredHumanAction: 'Planner must open WhatsApp and send manually.',
      body: 'Please confirm children ages and passport names.',
    };

    const markup = renderToStaticMarkup(
      createElement(SignatureDraftActionPanel, {
        draftActions: [draftAction],
        onInspectTrace: () => undefined,
        whatsappHandoffEnabled: true,
        onCreateWhatsAppHandoff: async () => ({
          referenceCode: 'WA-20260518-ABCD',
          waMeUrl: 'https://wa.me/573005550198?text=Hola',
          expiresAt: '2026-05-25T10:27:00.000Z',
        }),
      })
    );

    expect(markup).toContain('Create WhatsApp handoff');
    expect(markup).toContain('WhatsApp handoff');
    expect(markup).toContain('Manual send only');
    expect(markup).toContain('Not sent. Human must open and send manually.');
  });

  it('renders created WhatsApp handoff reference, wa.me and explicit manual-send copy', () => {
    const markup = renderToStaticMarkup(
      createElement(SignatureWhatsAppHandoffStatus, {
        state: {
          status: 'success',
          result: {
            referenceCode: 'WA-20260518-ABCD',
            waMeUrl: 'https://wa.me/573005550198?text=Hola',
            expiresAt: '2026-05-25T10:27:00.000Z',
          },
        },
      })
    );

    expect(markup).toContain('WhatsApp handoff created');
    expect(markup).toContain('Not sent');
    expect(markup).toContain('Human must open and send manually.');
    expect(markup).toContain('not reserved, not paid, not confirmed');
    expect(markup).toContain('WA-20260518-ABCD');
    expect(markup).toContain('wa.me/573005550198');
    expect(markup).toContain('2026-05-25T10:27:00.000Z');
  });

  it('renders local WhatsApp handoff loading and error states without send semantics', () => {
    const loadingMarkup = renderToStaticMarkup(
      createElement(SignatureWhatsAppHandoffStatus, {
        state: { status: 'loading' },
      })
    );
    const errorMarkup = renderToStaticMarkup(
      createElement(SignatureWhatsAppHandoffStatus, {
        state: { status: 'error', message: 'Endpoint unavailable' },
      })
    );

    expect(loadingMarkup).toContain('Creating WhatsApp handoff');
    expect(loadingMarkup).toContain('Not sent. Human must open and send manually.');
    expect(errorMarkup).toContain('WhatsApp handoff was not created');
    expect(errorMarkup).toContain('Endpoint unavailable');
    expect(errorMarkup).toContain('Not sent, not reserved, not paid, not confirmed.');
  });

  it('renders contract-style draft actions with string editable field names', () => {
    const draftAction: BukeerDraftAction = {
      id: 'draft-approval-packet',
      kind: 'approval_packet',
      title: 'Manager approval packet',
      status: 'draft_created',
      traceId: 'trace-cartagena-004',
      body: 'Review margin override and passenger readiness before public proposal send.',
      editableFields: ['body', 'title'],
      requiredHumanAction: 'Manager must review the packet before approval.',
    };

    const markup = renderToStaticMarkup(
      createElement(SignatureDraftActionPanel, {
        draftActions: [draftAction],
        onInspectTrace: () => undefined,
      })
    );

    expect(markup).toContain('Approval Packet');
    expect(markup).toContain('Draft Created');
    expect(markup).toContain('Body');
    expect(markup).toContain(
      'Review margin override and passenger readiness before public proposal send.'
    );
    expect(markup).toContain('Title');
    expect(markup).toContain('Manager approval packet');
  });
});
