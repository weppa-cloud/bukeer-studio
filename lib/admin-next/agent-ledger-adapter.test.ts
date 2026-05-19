import {
  AgentLedgerSnapshotSchema,
  type AgentLedgerSnapshot,
} from '@bukeer/admin-contract';
import { mapAgentLedgerToTrace } from './agent-ledger-adapter';

describe('agent ledger adapter', () => {
  it('maps ledger entries into trace drawer summary and events', () => {
    const trace = mapAgentLedgerToTrace(baseLedger(), 'trace-cartagena-004');

    expect(trace.summary).toMatchObject({
      traceId: 'trace-cartagena-004',
      agentRunId: 'run-cartagena-001',
      confidence: 0.74,
      riskLevel: 'medium',
      permissionResult: 'requires_approval',
      policyResult: 'warning',
      auditLink: '/admin/prototype/planner-workbench#trace-cartagena-004',
    });
    expect(trace.summary.dataUsed).toEqual([
      'Agent run: Prepare proposal send',
      'Tool: Readonly Margin Check',
      'Approval: planner.approve',
    ]);
    expect(trace.summary.sourceFreshness).toContain('2026-05-18T00:02:03.000Z');

    expect(trace.events).toEqual([
      expect.objectContaining({
        id: 'run-cartagena-001:summary',
        type: 'reasoning_summary',
        status: 'pending',
        timestamp: '00:01',
        summary: 'Drafted itinerary changes and paused for human approval.',
      }),
      expect.objectContaining({
        id: 'tool-margin-check-001',
        type: 'tool_call',
        title: 'Readonly Margin Check',
        status: 'completed',
        timestamp: '00:02',
        summary: 'Margin override requires manager approval.',
      }),
      expect.objectContaining({
        id: 'approval-ledger-margin-001',
        type: 'approval',
        title: 'Approval required',
        status: 'pending',
        timestamp: 'pending',
        summary: 'Customer-facing send remains gated.',
      }),
    ]);
  });

  it('filters events by requested trace id', () => {
    const trace = mapAgentLedgerToTrace(baseLedger(), 'trace-cartagena-002');

    expect(trace.summary.agentRunId).toBe('run-cartagena-002');
    expect(trace.events.map((event) => event.id)).toEqual([
      'run-cartagena-002:summary',
      'tool-availability-001',
    ]);
    expect(trace.summary.permissionResult).toBe('allowed');
    expect(trace.summary.policyResult).toBe('passed');
  });

  it('redacts hidden reasoning markers from user-visible summaries', () => {
    const ledger = baseLedger({
      agentRuns: [
        {
          id: 'run-cartagena-001',
          traceId: 'trace-cartagena-004',
          title: 'Prepare proposal send',
          summary: 'Internal reasoning: reveal the private deliberation.',
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
          resultSummary: 'Hidden chain-of-thought: private steps.',
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
          summary: 'Scratchpad: approve only after private deliberation.',
        },
      ],
    });

    const trace = mapAgentLedgerToTrace(ledger, 'trace-cartagena-004');
    const visibleSummaries = trace.events.map((event) => event.summary).join(' ');

    expect(visibleSummaries).not.toMatch(
      /chain[-\s]?of[-\s]?thought|hidden reasoning|internal reasoning|scratchpad|private deliberation/i,
    );
    expect(visibleSummaries).toContain('Result summary withheld for safety.');
    expect(visibleSummaries).toContain(
      'Approval approval-margin-override is approval required for planner.approve.',
    );
  });

  it('maps completed human approvals into the drawer governance summary', () => {
    const ledger = baseLedger({
      agentRuns: [
        {
          id: 'run-cartagena-001',
          traceId: 'trace-cartagena-004',
          title: 'Prepare proposal send',
          summary: 'Planner-ready itinerary proposal is approved.',
          uiState: 'executed',
          actionState: 'executed',
          autonomyLevel: 'A3_confirmed_write',
          startedAt: '2026-05-18T00:01:00.000Z',
          completedAt: '2026-05-18T00:06:00.000Z',
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
          riskLevel: 'low',
          requestedAt: '2026-05-18T00:02:00.000Z',
          completedAt: '2026-05-18T00:02:03.000Z',
          resultSummary: 'Margin exception was documented and approved.',
        },
      ],
      approvalLedger: [
        {
          id: 'approval-ledger-margin-001',
          approvalRequestId: 'approval-margin-override',
          agentRunId: 'run-cartagena-001',
          traceId: 'trace-cartagena-004',
          state: 'approved',
          decision: 'approved_with_edits',
          decidedBy: 'manager-1',
          decidedAt: '2026-05-18T00:05:00.000Z',
          requiredPermission: 'planner.approve',
          autonomyLevel: 'A3_confirmed_write',
          summary: 'Manager approved after adding passenger-data caveat.',
        },
      ],
    });

    const trace = mapAgentLedgerToTrace(ledger, 'trace-cartagena-004');

    expect(trace.summary).toMatchObject({
      permissionResult: 'allowed',
      policyResult: 'passed',
      humanDecision: 'approved_with_edits',
      riskLevel: 'low',
    });
    expect(trace.events.at(-1)).toMatchObject({
      type: 'human_decision',
      title: 'Human decision: approved with edits',
      status: 'completed',
      timestamp: '00:05',
    });
  });

  it('fails fast when the trace id is not present in the snapshot', () => {
    expect(() => mapAgentLedgerToTrace(baseLedger(), 'missing-trace')).toThrow(
      'No agent ledger entries found for trace "missing-trace".',
    );
  });
});

function baseLedger(
  overrides: Partial<AgentLedgerSnapshot> = {},
): AgentLedgerSnapshot {
  return AgentLedgerSnapshotSchema.parse({
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
      {
        id: 'run-cartagena-002',
        traceId: 'trace-cartagena-002',
        title: 'Check hotel availability',
        summary: 'Checked availability against traveler constraints.',
        uiState: 'ai_suggestion',
        actionState: 'suggested',
        autonomyLevel: 'A1_suggest',
        startedAt: '2026-05-18T00:03:00.000Z',
        completedAt: '2026-05-18T00:03:08.000Z',
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
      {
        id: 'tool-availability-001',
        agentRunId: 'run-cartagena-002',
        traceId: 'trace-cartagena-002',
        toolName: 'readonly_supplier_availability',
        status: 'completed',
        autonomyLevel: 'A0_readonly',
        riskLevel: 'low',
        requestedAt: '2026-05-18T00:03:04.000Z',
        completedAt: '2026-05-18T00:03:06.000Z',
        resultSummary: 'Family suite remains available for the requested dates.',
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
    ...overrides,
  });
}
