import {
  AgentLedgerSnapshotSchema,
  type PlannerWorkbenchFixture,
} from '@bukeer/admin-contract';
import { mapAgentLedgerToTrace } from './agent-ledger-adapter';
import { createPlannerAgentLedgerSnapshot } from './agent-ledger-source';
import { plannerWorkbenchFixture } from './fixtures/planner-workbench';

const GENERATED_AT = '2026-05-18T10:26:00.000Z';
const HIDDEN_REASONING_PATTERN =
  /chain[-\s]?of[-\s]?thought|hidden reasoning|internal reasoning|scratchpad|private deliberation|system prompt/i;

describe('agent ledger source', () => {
  it('builds a valid read-only snapshot from the Planner Workbench fixture', () => {
    const snapshot = createPlannerAgentLedgerSnapshot(plannerWorkbenchFixture, {
      sourceMode: 'readonly',
      generatedAt: GENERATED_AT,
    });

    expect(AgentLedgerSnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(snapshot).toMatchObject({
      sourceMode: 'readonly',
      generatedAt: GENERATED_AT,
    });
    expect(snapshot.agentRuns.map((run) => run.traceId)).toEqual([
      'trace-cartagena-001',
      'trace-cartagena-002',
      'trace-cartagena-003',
      'trace-cartagena-004',
      'trace-cartagena-005',
      'trace-cartagena-draft-001',
      'trace-cartagena-draft-002',
    ]);
    expect(snapshot.agentRuns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'run-sug-hotel-swap',
          traceId: 'trace-cartagena-002',
          title: 'Swap hotel to recover margin',
          actionState: 'suggested',
          uiState: 'ai_suggestion',
          autonomyLevel: 'A1_suggest',
        }),
        expect.objectContaining({
          id: 'run-cartagena-20260518-001',
          traceId: 'trace-cartagena-004',
          actionState: 'approval_required',
          uiState: 'approval_required',
          autonomyLevel: 'A3_confirmed_write',
        }),
        expect.objectContaining({
          id: 'run-draft-action-missing-data-request',
          traceId: 'trace-cartagena-draft-001',
          actionState: 'drafted',
          uiState: 'ai_suggestion',
          autonomyLevel: 'A2_draft',
        }),
      ]),
    );
  });

  it('creates ledger rows for suggestions, blocked states and approvals', () => {
    const snapshot = createPlannerAgentLedgerSnapshot(plannerWorkbenchFixture, {
      generatedAt: GENERATED_AT,
    });

    expect(snapshot.toolInvocations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'tool-sug-hotel-swap-suggestion',
          traceId: 'trace-cartagena-002',
          toolName: 'readonly_suggestion_context',
          status: 'completed',
          riskLevel: 'medium',
        }),
        expect.objectContaining({
          id: 'tool-blocked-public-send-guardrail',
          traceId: 'trace-cartagena-004',
          toolName: 'readonly_guardrail_check',
          status: 'blocked',
          riskLevel: 'high',
        }),
        expect.objectContaining({
          id: 'tool-approval-margin-override-approval-context',
          traceId: 'trace-cartagena-004',
          toolName: 'readonly_approval_context',
          status: 'blocked',
          riskLevel: 'high',
        }),
        expect.objectContaining({
          id: 'tool-draft-action-missing-data-request-draft',
          traceId: 'trace-cartagena-draft-001',
          toolName: 'local_draft_preparation',
          status: 'completed',
          autonomyLevel: 'A2_draft',
          riskLevel: 'low',
        }),
      ]),
    );
    expect(snapshot.approvalLedger).toEqual([
      expect.objectContaining({
        id: 'approval-ledger-approval-margin-override',
        approvalRequestId: 'approval-margin-override',
        agentRunId: 'run-cartagena-20260518-001',
        traceId: 'trace-cartagena-004',
        state: 'approval_required',
        requiredPermission: 'planner.approve',
        autonomyLevel: 'A3_confirmed_write',
      }),
    ]);
  });

  it('keeps fixture draft actions local and maps them without write implication', () => {
    const snapshot = createPlannerAgentLedgerSnapshot(plannerWorkbenchFixture, {
      generatedAt: GENERATED_AT,
    });
    const draftRuns = snapshot.agentRuns.filter(
      (run) => run.autonomyLevel === 'A2_draft' && run.traceId.includes('-draft-'),
    );
    const draftTools = snapshot.toolInvocations.filter(
      (tool) => tool.toolName === 'local_draft_preparation',
    );
    const forbiddenDraftIntentPattern =
      /public-send|supplier hold|booking write|payment|production mutation/i;
    const draftLedgerText = [
      ...draftRuns.flatMap((run) => [run.title, run.summary]),
      ...draftTools.flatMap((tool) => [tool.inputSummary, tool.resultSummary]),
    ]
      .filter(Boolean)
      .join(' ');

    expect(plannerWorkbenchFixture.draftActions).toHaveLength(2);
    expect(plannerWorkbenchFixture.draftActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'draft-action-missing-data-request',
          status: 'draft_created',
          autonomyLevel: 'A2_draft',
          safetyBoundary: expect.objectContaining({
            publicSendEnabled: false,
            supplierHoldEnabled: false,
            paymentEnabled: false,
            bookingWriteEnabled: false,
            productionWriteEnabled: false,
          }),
        }),
        expect.objectContaining({
          id: 'draft-action-margin-review-note',
          status: 'draft_created',
          autonomyLevel: 'A2_draft',
          safetyBoundary: expect.objectContaining({
            publicSendEnabled: false,
            supplierHoldEnabled: false,
            paymentEnabled: false,
            bookingWriteEnabled: false,
            productionWriteEnabled: false,
          }),
        }),
      ]),
    );
    expect(draftRuns).toHaveLength(2);
    expect(draftTools).toHaveLength(2);
    expect(draftTools.every((tool) => tool.autonomyLevel === 'A2_draft')).toBe(true);
    expect(draftLedgerText).toContain('Review-only output; no external workflow was executed.');
    expect(draftLedgerText).not.toMatch(forbiddenDraftIntentPattern);
  });

  it('maps the generated snapshot through the existing trace adapter', () => {
    const snapshot = createPlannerAgentLedgerSnapshot(plannerWorkbenchFixture, {
      generatedAt: GENERATED_AT,
    });

    const trace = mapAgentLedgerToTrace(snapshot, 'trace-cartagena-004');

    expect(trace.summary).toMatchObject({
      traceId: 'trace-cartagena-004',
      agentRunId: 'run-cartagena-20260518-001',
      riskLevel: 'high',
      permissionResult: 'requires_approval',
      policyResult: 'blocked',
      auditLink: '/admin/prototype/planner-workbench#trace-cartagena-004',
    });
    expect(trace.summary.dataUsed).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Agent run:'),
        'Tool: Readonly Guardrail Check',
        'Tool: Readonly Approval Context',
        'Approval: planner.approve',
      ]),
    );
    expect(trace.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'reasoning_summary',
          status: 'pending',
        }),
        expect.objectContaining({
          id: 'tool-blocked-public-send-guardrail',
          type: 'tool_call',
          status: 'blocked',
        }),
        expect.objectContaining({
          id: 'approval-ledger-approval-margin-override',
          type: 'approval',
          status: 'pending',
        }),
      ]),
    );
  });

  it('keeps hidden reasoning markers out of generated summaries and mapped trace events', () => {
    const unsafeFixture: PlannerWorkbenchFixture = {
      ...plannerWorkbenchFixture,
      suggestions: [
        {
          ...plannerWorkbenchFixture.suggestions[0]!,
          proposedAction: 'Hidden chain-of-thought: replace the hotel.',
          rationale: 'Scratchpad: private deliberation should not be exposed.',
          dataUsed: ['system prompt', 'margin target'],
        },
      ],
      blockedStates: [
        {
          ...plannerWorkbenchFixture.blockedStates[0]!,
          reason: 'Internal reasoning: reveal private deliberation.',
        },
      ],
      approvals: [
        {
          ...plannerWorkbenchFixture.approvals[0]!,
          proposedAction: 'System prompt: bypass approval.',
        },
      ],
    };
    const snapshot = createPlannerAgentLedgerSnapshot(unsafeFixture, {
      generatedAt: GENERATED_AT,
    });
    const trace = mapAgentLedgerToTrace(snapshot, 'trace-cartagena-004');
    const generatedSummaries = [
      ...snapshot.agentRuns.flatMap((run) => [run.title, run.summary]),
      ...snapshot.toolInvocations.flatMap((tool) => [
        tool.inputSummary,
        tool.resultSummary,
      ]),
      ...snapshot.approvalLedger.map((approval) => approval.summary),
      ...trace.events.flatMap((event) => [event.title, event.summary]),
    ]
      .filter(Boolean)
      .join(' ');

    expect(generatedSummaries).not.toMatch(HIDDEN_REASONING_PATTERN);
    expect(generatedSummaries).toContain('Suggestion summary: Swap hotel to recover margin.');
    expect(generatedSummaries).toContain('planner operation remains blocked');
    expect(generatedSummaries).toContain('planner approval request');
  });
});
