import {
  DraftActionSchema,
  DraftActionSafetyBoundarySchema,
  PlannerWorkbenchFixtureSchema,
} from './index';

const validDraftAction = {
  id: 'draft-action-customer-reply-001',
  title: 'Draft customer reply for missing traveler ages',
  kind: 'customer_reply',
  status: 'draft_created',
  autonomyLevel: 'A2_draft',
  traceId: 'trace-cartagena-004',
  sourceSuggestionId: 'suggestion-cartagena-001',
  body: 'Hi Ana, could you confirm the children ages before we finalize the quote?',
  editableFields: ['body', 'title'],
  requiredHumanAction: 'Review, edit if needed, then send manually.',
  safetyBoundary: {
    publicSendEnabled: false,
    supplierHoldEnabled: false,
    paymentEnabled: false,
    bookingWriteEnabled: false,
    productionWriteEnabled: false,
  },
  riskLevel: 'low',
  createdAt: '2026-05-18T00:10:00.000Z',
};

const minimalPlannerWorkbenchFixture = {
  opportunity: {
    id: 'opp-cartagena-001',
    leadName: 'Ana Gomez',
    destination: 'Cartagena',
    sourceChannel: 'WhatsApp',
    tripDates: 'Jun 12-17',
    durationLabel: '5 nights',
    valueLabel: 'USD 4,800',
    slaLabel: '2h left',
    uiState: 'ai_suggestion',
    actionState: 'suggested',
    missingDataCount: 1,
    marginLabel: '22%',
    traveler: {
      name: 'Ana Gomez',
      pax: {
        adults: 2,
        children: 2,
      },
    },
  },
  opportunities: [],
  itinerarySegments: [],
  liveFeed: [],
  suggestions: [],
  blockedStates: [],
  approvals: [],
  traceSummary: {
    traceId: 'trace-cartagena-004',
    agentRunId: 'run-cartagena-001',
    dataUsed: ['opportunity', 'traveler_profile'],
    sourceFreshness: 'fixture',
    confidence: 0.82,
    riskLevel: 'low',
    permissionResult: 'allowed',
    policyResult: 'passed',
    auditLink: '/admin/trace/trace-cartagena-004',
  },
  traceEvents: [],
  missingData: ['Children ages'],
};

describe('Draft-only action contract', () => {
  it('validates a non-production-write draft action', () => {
    const parsed = DraftActionSchema.parse(validDraftAction);

    expect(parsed.autonomyLevel).toBe('A2_draft');
    expect(parsed.safetyBoundary.productionWriteEnabled).toBe(false);
  });

  it('rejects production-write-enabled safety flags', () => {
    const unsafeBoundary = {
      publicSendEnabled: false,
      supplierHoldEnabled: false,
      paymentEnabled: false,
      bookingWriteEnabled: false,
      productionWriteEnabled: true,
    };

    expect(DraftActionSafetyBoundarySchema.safeParse(unsafeBoundary).success).toBe(
      false,
    );

    expect(
      DraftActionSchema.safeParse({
        ...validDraftAction,
        safetyBoundary: unsafeBoundary,
      }).success,
    ).toBe(false);
  });

  it('defaults planner workbench draft actions to an empty array', () => {
    const parsed = PlannerWorkbenchFixtureSchema.parse(
      minimalPlannerWorkbenchFixture,
    );

    expect(parsed.draftActions).toEqual([]);
  });
});
