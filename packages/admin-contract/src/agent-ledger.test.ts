import {
  AgentLedgerSnapshotSchema,
  ApprovalDecisionSchema,
  DraftActionSchema,
  ToolInvocationSchema,
} from './index';

describe('Agent ledger contract', () => {
  it('validates a readonly run with tool and approval ledger entries', () => {
    const parsed = AgentLedgerSnapshotSchema.parse({
      sourceMode: 'readonly',
      generatedAt: '2026-05-18T00:00:00.000Z',
      agentRuns: [
        {
          id: 'run-cartagena-001',
          traceId: 'trace-cartagena-004',
          title: 'Prepare proposal send',
          summary: 'Drafted itinerary changes and paused for human approval.',
          uiState: 'approval_required',
          actionState: 'approval_required',
          autonomyLevel: 'A2_draft',
          startedAt: '2026-05-18T00:01:00.000Z',
        },
      ],
      toolInvocations: [
        {
          id: 'tool-margin-check-001',
          agentRunId: 'run-cartagena-001',
          traceId: 'trace-cartagena-004',
          toolName: 'readonly_margin_check',
          status: 'completed',
          autonomyLevel: 'A0_readonly',
          riskLevel: 'medium',
          requestedAt: '2026-05-18T00:02:00.000Z',
          completedAt: '2026-05-18T00:02:03.000Z',
          resultSummary: 'Margin override requires manager approval.',
        },
      ],
      approvalLedger: [
        {
          id: 'approval-ledger-margin-001',
          approvalRequestId: 'approval-margin-override',
          agentRunId: 'run-cartagena-001',
          traceId: 'trace-cartagena-004',
          state: 'approval_required',
          requiredPermission: 'planner.approve',
          autonomyLevel: 'A3_confirmed_write',
          summary: 'Customer-facing send remains gated.',
        },
      ],
    });

    expect(parsed.sourceMode).toBe('readonly');
    expect(parsed.agentRuns[0]?.uiState).toBe('approval_required');
    expect(parsed.toolInvocations[0]?.autonomyLevel).toBe('A0_readonly');
  });

  it('rejects write-oriented ledger source modes', () => {
    const result = AgentLedgerSnapshotSchema.safeParse({
      sourceMode: 'production_write',
      generatedAt: '2026-05-18T00:00:00.000Z',
      agentRuns: [],
      toolInvocations: [],
      approvalLedger: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid tool states and approval decisions', () => {
    expect(
      ToolInvocationSchema.safeParse({
        id: 'tool-1',
        agentRunId: 'run-1',
        traceId: 'trace-1',
        toolName: 'readonly_margin_check',
        status: 'writing',
        autonomyLevel: 'A0_readonly',
        requestedAt: '2026-05-18T00:02:00.000Z',
      }).success,
    ).toBe(false);

    expect(ApprovalDecisionSchema.safeParse('pending').success).toBe(false);
  });

  it('validates manual WhatsApp handoff as a draft-only ledger tool', () => {
    const draft = DraftActionSchema.parse({
      id: 'draft-action-whatsapp-handoff',
      title: 'Draft WhatsApp reply',
      kind: 'manual_whatsapp_handoff',
      status: 'draft_created',
      autonomyLevel: 'A2_draft',
      traceId: 'trace-whatsapp-handoff-001',
      body: 'Hi Mariana, could you confirm the traveler details?',
      editableFields: ['body', 'title'],
      requiredHumanAction: 'Open WhatsApp, review the draft, and send manually.',
      safetyBoundary: {
        publicSendEnabled: false,
        supplierHoldEnabled: false,
        paymentEnabled: false,
        bookingWriteEnabled: false,
        productionWriteEnabled: false,
      },
      riskLevel: 'low',
      createdAt: '2026-05-18T00:10:00.000Z',
    });

    const tool = ToolInvocationSchema.parse({
      id: 'tool-draft-action-whatsapp-handoff-draft',
      agentRunId: 'run-whatsapp-handoff-001',
      traceId: draft.traceId,
      toolName: 'manual_whatsapp_handoff_preparation',
      status: 'completed',
      autonomyLevel: draft.autonomyLevel,
      riskLevel: draft.riskLevel,
      requestedAt: '2026-05-18T00:11:00.000Z',
      completedAt: '2026-05-18T00:12:00.000Z',
      resultSummary:
        'Manual WhatsApp handoff prepared locally. Not sent. Human must open WhatsApp and send manually.',
    });

    expect(draft.kind).toBe('manual_whatsapp_handoff');
    expect(tool.status).toBe('completed');
    expect(tool.autonomyLevel).toBe('A2_draft');
    expect(tool.resultSummary).toContain('Not sent');
    expect(tool.resultSummary).toContain(
      'Human must open WhatsApp and send manually',
    );
  });
});
