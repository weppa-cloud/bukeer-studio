import {
  AgentLedgerSnapshotSchema,
  type AgentLedgerSnapshot,
} from '@bukeer/admin-contract';

export const agentLedgerFixture: AgentLedgerSnapshot =
  AgentLedgerSnapshotSchema.parse({
    sourceMode: 'fixture',
    generatedAt: '2026-05-18T10:26:00.000Z',
    agentRuns: [
      {
        id: 'run-cartagena-transfer-001',
        traceId: 'trace-cartagena-001',
        title: 'Verify private airport transfer',
        summary:
          'Transfer was already confirmed and remains visible as executed context.',
        uiState: 'executed',
        actionState: 'executed',
        autonomyLevel: 'A0_readonly',
        startedAt: '2026-05-18T10:21:00.000Z',
        completedAt: '2026-05-18T10:21:12.000Z',
      },
      {
        id: 'run-cartagena-hotel-001',
        traceId: 'trace-cartagena-002',
        title: 'Recommend hotel margin recovery',
        summary:
          'Compared supplier availability, traveler constraints and margin target before suggesting a hotel swap.',
        uiState: 'ai_suggestion',
        actionState: 'suggested',
        autonomyLevel: 'A1_suggest',
        startedAt: '2026-05-18T10:22:00.000Z',
        completedAt: '2026-05-18T10:24:08.000Z',
      },
      {
        id: 'run-cartagena-missing-data-001',
        traceId: 'trace-cartagena-003',
        title: 'Prepare missing-data request',
        summary:
          'Drafted a passenger-data request because supplier policy blocks the charter until names and ages are collected.',
        uiState: 'ai_blocked',
        actionState: 'blocked_missing_data',
        autonomyLevel: 'A2_draft',
        startedAt: '2026-05-18T10:24:00.000Z',
        completedAt: '2026-05-18T10:25:03.000Z',
      },
      {
        id: 'run-cartagena-20260518-001',
        traceId: 'trace-cartagena-004',
        title: 'Prepare proposal send',
        summary:
          'Assembled proposal evidence and paused because margin override and passenger gaps require human approval.',
        uiState: 'approval_required',
        actionState: 'approval_required',
        autonomyLevel: 'A2_draft',
        startedAt: '2026-05-18T10:24:00.000Z',
      },
      {
        id: 'run-cartagena-hold-001',
        traceId: 'trace-cartagena-005',
        title: 'Monitor expiring supplier hold',
        summary:
          'Flagged the Sofitel hold as expired-risk context without attempting a supplier write.',
        uiState: 'ai_blocked',
        actionState: 'expired',
        autonomyLevel: 'A0_readonly',
        startedAt: '2026-05-18T10:23:00.000Z',
        completedAt: '2026-05-18T10:25:00.000Z',
      },
    ],
    toolInvocations: [
      {
        id: 'tool-transfer-read-001',
        agentRunId: 'run-cartagena-transfer-001',
        traceId: 'trace-cartagena-001',
        toolName: 'readonly_itinerary_read',
        status: 'completed',
        autonomyLevel: 'A0_readonly',
        riskLevel: 'low',
        requestedAt: '2026-05-18T10:21:04.000Z',
        completedAt: '2026-05-18T10:21:12.000Z',
        resultSummary:
          'Airport transfer is confirmed and does not require additional approval.',
      },
      {
        id: 'tool-hotel-availability-001',
        agentRunId: 'run-cartagena-hotel-001',
        traceId: 'trace-cartagena-002',
        toolName: 'readonly_supplier_availability',
        status: 'completed',
        autonomyLevel: 'A0_readonly',
        riskLevel: 'low',
        requestedAt: '2026-05-18T10:23:00.000Z',
        completedAt: '2026-05-18T10:23:18.000Z',
        resultSummary:
          'Hotel Casa San Agustin has a family-suite option for the requested dates.',
      },
      {
        id: 'tool-hotel-margin-001',
        agentRunId: 'run-cartagena-hotel-001',
        traceId: 'trace-cartagena-002',
        toolName: 'readonly_margin_check',
        status: 'completed',
        autonomyLevel: 'A0_readonly',
        riskLevel: 'medium',
        requestedAt: '2026-05-18T10:23:19.000Z',
        completedAt: '2026-05-18T10:24:08.000Z',
        resultSummary:
          'Suggested hotel swap improves margin while preserving Old City proximity.',
      },
      {
        id: 'tool-charter-policy-001',
        agentRunId: 'run-cartagena-missing-data-001',
        traceId: 'trace-cartagena-003',
        toolName: 'readonly_supplier_policy_check',
        status: 'blocked',
        autonomyLevel: 'A0_readonly',
        riskLevel: 'high',
        requestedAt: '2026-05-18T10:24:12.000Z',
        completedAt: '2026-05-18T10:25:03.000Z',
        resultSummary:
          'Boat insurance requires children ages and full passport names before confirmation.',
      },
      {
        id: 'tool-proposal-context-001',
        agentRunId: 'run-cartagena-20260518-001',
        traceId: 'trace-cartagena-004',
        toolName: 'readonly_context_packet',
        status: 'completed',
        autonomyLevel: 'A0_readonly',
        riskLevel: 'medium',
        requestedAt: '2026-05-18T10:24:20.000Z',
        completedAt: '2026-05-18T10:25:10.000Z',
        resultSummary:
          'Lead, itinerary, supplier holds, missing data and margin policy were included.',
      },
      {
        id: 'tool-proposal-guardrail-001',
        agentRunId: 'run-cartagena-20260518-001',
        traceId: 'trace-cartagena-004',
        toolName: 'proposal_readiness_guard',
        status: 'blocked',
        autonomyLevel: 'A0_readonly',
        riskLevel: 'high',
        requestedAt: '2026-05-18T10:25:11.000Z',
        completedAt: '2026-05-18T10:26:00.000Z',
        resultSummary:
          'Public send remains blocked until passenger data and manager approval are resolved.',
      },
      {
        id: 'tool-hold-monitor-001',
        agentRunId: 'run-cartagena-hold-001',
        traceId: 'trace-cartagena-005',
        toolName: 'readonly_supplier_hold_monitor',
        status: 'blocked',
        autonomyLevel: 'A0_readonly',
        riskLevel: 'medium',
        requestedAt: '2026-05-18T10:24:30.000Z',
        completedAt: '2026-05-18T10:25:00.000Z',
        resultSummary:
          'Supplier hold is expiring soon; prototype mode does not refresh holds.',
      },
    ],
    approvalLedger: [
      {
        id: 'approval-ledger-margin-001',
        approvalRequestId: 'approval-margin-override',
        agentRunId: 'run-cartagena-20260518-001',
        traceId: 'trace-cartagena-004',
        state: 'approval_required',
        requiredPermission: 'planner.approve',
        autonomyLevel: 'A3_confirmed_write',
        summary:
          'Manager approval is required before sending a proposal under margin target.',
      },
    ],
  });
