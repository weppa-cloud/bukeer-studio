import { z } from 'zod';

export const HumanAgentUiStateSchema = z.enum([
  'normal',
  'loading',
  'empty',
  'error',
  'no_permission',
  'ai_suggestion',
  'ai_blocked',
  'approval_required',
  'approved',
  'rejected',
  'executing',
  'executed',
  'trace_available',
]);

export type HumanAgentUiState = z.infer<typeof HumanAgentUiStateSchema>;

export const AgenticActionStateSchema = z.enum([
  'observed',
  'suggested',
  'drafted',
  'blocked_missing_data',
  'blocked_policy',
  'approval_required',
  'approved',
  'executing',
  'executed',
  'rejected',
  'expired',
]);

export type AgenticActionState = z.infer<typeof AgenticActionStateSchema>;

export const AgentAutonomyLevelSchema = z.enum([
  'A0_readonly',
  'A1_suggest',
  'A2_draft',
  'A3_confirmed_write',
  'A4_live_gated',
]);

export type AgentAutonomyLevel = z.infer<typeof AgentAutonomyLevelSchema>;

export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const AdminDataSourceModeSchema = z.enum(['fixture', 'readonly']);
export type AdminDataSourceMode = z.infer<typeof AdminDataSourceModeSchema>;

export const AdminPermissionSchema = z.enum([
  'admin_next.view',
  'planner.view',
  'planner.suggest',
  'planner.approve',
  'payments.manage',
  'trace.view',
  'manager.view',
]);

export type AdminPermission = z.infer<typeof AdminPermissionSchema>;

export const AdminFeatureFlagsSchema = z.object({
  adminNextPrototype: z.boolean(),
});

export type AdminFeatureFlags = z.infer<typeof AdminFeatureFlagsSchema>;

export const AuthenticatedAdminSessionContextSchema = z.object({
  status: z.literal('authenticated'),
  userId: z.string().min(1),
  email: z.string(),
  accountId: z.string().min(1),
  role: z.string().min(1),
  displayName: z.string().min(1),
  permissions: z.array(AdminPermissionSchema),
  flags: AdminFeatureFlagsSchema,
});

export const AdminSessionContextSchema = z.discriminatedUnion('status', [
  AuthenticatedAdminSessionContextSchema,
  z.object({
    status: z.literal('missing_role'),
    userId: z.string().min(1),
    email: z.string(),
    displayName: z.string().min(1),
    flags: AdminFeatureFlagsSchema,
  }),
  z.object({
    status: z.literal('unauthenticated'),
    flags: AdminFeatureFlagsSchema,
  }),
]);

export type AuthenticatedAdminSessionContext = z.infer<
  typeof AuthenticatedAdminSessionContextSchema
>;

export type AdminSessionContext = z.infer<typeof AdminSessionContextSchema>;

export const TravelerProfileSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  pax: z.object({
    adults: z.number().int().nonnegative(),
    children: z.number().int().nonnegative(),
  }),
});

export type TravelerProfile = z.infer<typeof TravelerProfileSchema>;

export const TravelOntologyVersionSchema = z.literal('travel_ontology_v1');
export type TravelOntologyVersion = z.infer<typeof TravelOntologyVersionSchema>;

export const TravelOntologyEntityKindSchema = z.enum([
  'opportunity',
  'traveler',
  'itinerary',
  'itinerary_segment',
  'supplier',
  'product',
  'policy',
  'missing_data',
  'trace',
]);

export type TravelOntologyEntityKind = z.infer<
  typeof TravelOntologyEntityKindSchema
>;

export const TravelOntologyEntityRefSchema = z.object({
  kind: TravelOntologyEntityKindSchema,
  id: z.string().min(1),
  label: z.string().min(1).optional(),
});

export type TravelOntologyEntityRef = z.infer<
  typeof TravelOntologyEntityRefSchema
>;

export const TravelOntologyMoneySchema = z.object({
  amount: z.number().finite().nonnegative(),
  currency: z.string().length(3),
});

export type TravelOntologyMoney = z.infer<typeof TravelOntologyMoneySchema>;

export const TravelOntologyDateRangeSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export type TravelOntologyDateRange = z.infer<
  typeof TravelOntologyDateRangeSchema
>;

export const TravelOntologyPaxSchema = z.object({
  adults: z.number().int().nonnegative(),
  children: z.number().int().nonnegative(),
});

export type TravelOntologyPax = z.infer<typeof TravelOntologyPaxSchema>;

export const TravelOntologyOpportunitySchema = z.object({
  ref: TravelOntologyEntityRefSchema.extend({
    kind: z.literal('opportunity'),
  }),
  traveler: TravelOntologyEntityRefSchema.extend({
    kind: z.literal('traveler'),
  }),
  destination: z.string().min(1),
  tripWindow: TravelOntologyDateRangeSchema.optional(),
  pax: TravelOntologyPaxSchema,
  budget: TravelOntologyMoneySchema.optional(),
  sourceChannel: z.string().min(1).optional(),
  readonlyReason: z.string().min(1).optional(),
});

export type TravelOntologyOpportunity = z.infer<
  typeof TravelOntologyOpportunitySchema
>;

export const TravelOntologyItinerarySegmentSchema = z.object({
  ref: TravelOntologyEntityRefSchema.extend({
    kind: z.literal('itinerary_segment'),
  }),
  opportunity: TravelOntologyEntityRefSchema.extend({
    kind: z.literal('opportunity'),
  }),
  supplier: TravelOntologyEntityRefSchema.extend({
    kind: z.literal('supplier'),
  }).optional(),
  product: TravelOntologyEntityRefSchema.extend({
    kind: z.literal('product'),
  }).optional(),
  serviceDate: z.string().min(1).optional(),
  status: AgenticActionStateSchema,
  price: TravelOntologyMoneySchema.optional(),
  trace: TravelOntologyEntityRefSchema.extend({
    kind: z.literal('trace'),
  }).optional(),
});

export type TravelOntologyItinerarySegment = z.infer<
  typeof TravelOntologyItinerarySegmentSchema
>;

export const TravelOntologySnapshotSchema = z.object({
  version: TravelOntologyVersionSchema,
  sourceMode: AdminDataSourceModeSchema,
  generatedAt: z.string().min(1),
  accountId: z.string().min(1).optional(),
  opportunities: z.array(TravelOntologyOpportunitySchema),
  itinerarySegments: z.array(TravelOntologyItinerarySegmentSchema),
  missingData: z.array(z.string()),
});

export type TravelOntologySnapshot = z.infer<
  typeof TravelOntologySnapshotSchema
>;

export const PlannerOpportunitySchema = z.object({
  id: z.string().min(1),
  leadName: z.string(),
  destination: z.string(),
  sourceChannel: z.string(),
  tripDates: z.string(),
  durationLabel: z.string(),
  valueLabel: z.string(),
  slaLabel: z.string(),
  uiState: HumanAgentUiStateSchema,
  actionState: AgenticActionStateSchema,
  missingDataCount: z.number().int().nonnegative(),
  marginLabel: z.string(),
  traveler: TravelerProfileSchema,
});

export type PlannerOpportunity = z.infer<typeof PlannerOpportunitySchema>;

export const AgentSuggestionSchema = z.object({
  id: z.string().min(1),
  state: AgenticActionStateSchema,
  title: z.string(),
  proposedAction: z.string(),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  dataUsed: z.array(z.string()),
  riskLevel: RiskLevelSchema,
  traceId: z.string().min(1),
  sourceFreshness: z.string().optional(),
  autonomyLevel: AgentAutonomyLevelSchema,
});

export type AgentSuggestion = z.infer<typeof AgentSuggestionSchema>;

export const DraftActionKindSchema = z.enum([
  'customer_reply',
  'missing_data_request',
  'manual_whatsapp_handoff',
  'itinerary_outline',
  'approval_packet',
  'supplier_comparison',
  'quote_readiness_checklist',
  'internal_follow_up_task',
  'audit_summary',
]);

export type DraftActionKind = z.infer<typeof DraftActionKindSchema>;

export const DraftActionStatusSchema = z.enum([
  'suggested',
  'draft_created',
  'edited',
  'discarded',
  'blocked',
  'approval_required',
]);

export type DraftActionStatus = z.infer<typeof DraftActionStatusSchema>;

export const DraftActionSafetyBoundarySchema = z.object({
  publicSendEnabled: z.literal(false),
  supplierHoldEnabled: z.literal(false),
  paymentEnabled: z.literal(false),
  bookingWriteEnabled: z.literal(false),
  productionWriteEnabled: z.literal(false),
});

export type DraftActionSafetyBoundary = z.infer<
  typeof DraftActionSafetyBoundarySchema
>;

export const DraftActionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: DraftActionKindSchema,
  status: DraftActionStatusSchema,
  autonomyLevel: z.literal('A2_draft'),
  traceId: z.string().min(1),
  sourceSuggestionId: z.string().min(1).optional(),
  body: z.string(),
  editableFields: z.array(z.string().min(1)),
  requiredHumanAction: z.string().min(1),
  safetyBoundary: DraftActionSafetyBoundarySchema,
  riskLevel: RiskLevelSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1).optional(),
});

export type DraftAction = z.infer<typeof DraftActionSchema>;

export const AgentBlockedStateSchema = z.object({
  id: z.string().min(1),
  state: z.enum(['blocked_missing_data', 'blocked_policy']),
  title: z.string(),
  reason: z.string(),
  missingData: z.array(z.string()).optional(),
  policyKey: z.string().optional(),
  requiredPermission: z.string().optional(),
  escalationPath: z.string().optional(),
  traceId: z.string().min(1),
});

export type AgentBlockedState = z.infer<typeof AgentBlockedStateSchema>;

export const ApprovalRequestSchema = z.object({
  id: z.string().min(1),
  state: z.enum(['approval_required', 'approved', 'rejected', 'expired']),
  proposedAction: z.string(),
  impact: z.object({
    customer: z.string().optional(),
    finance: z.string().optional(),
    operations: z.string().optional(),
  }),
  riskFlags: z.array(z.string()),
  missingData: z.array(z.string()),
  requiredApprover: z.string(),
  requiredPermission: z.string(),
  slaLabel: z.string().optional(),
  traceId: z.string().min(1),
  agentRunId: z.string().min(1),
});

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

export const AgentRunSchema = z.object({
  id: z.string().min(1),
  traceId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  uiState: HumanAgentUiStateSchema,
  actionState: AgenticActionStateSchema,
  autonomyLevel: AgentAutonomyLevelSchema,
  startedAt: z.string().min(1),
  completedAt: z.string().min(1).optional(),
});

export type AgentRun = z.infer<typeof AgentRunSchema>;

export const ToolInvocationStatusSchema = z.enum([
  'requested',
  'running',
  'completed',
  'blocked',
  'failed',
]);

export type ToolInvocationStatus = z.infer<
  typeof ToolInvocationStatusSchema
>;

export const ToolInvocationSchema = z.object({
  id: z.string().min(1),
  agentRunId: z.string().min(1),
  traceId: z.string().min(1),
  toolName: z.string().min(1),
  status: ToolInvocationStatusSchema,
  autonomyLevel: AgentAutonomyLevelSchema,
  riskLevel: RiskLevelSchema.optional(),
  requestedAt: z.string().min(1),
  completedAt: z.string().min(1).optional(),
  inputSummary: z.string().optional(),
  resultSummary: z.string().optional(),
});

export type ToolInvocation = z.infer<typeof ToolInvocationSchema>;

export const ApprovalDecisionSchema = z.enum([
  'approved',
  'approved_with_edits',
  'rejected',
  'escalated',
]);

export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

export const ApprovalLedgerEntrySchema = z.object({
  id: z.string().min(1),
  approvalRequestId: z.string().min(1),
  agentRunId: z.string().min(1),
  traceId: z.string().min(1),
  state: z.enum(['approval_required', 'approved', 'rejected', 'expired']),
  decision: ApprovalDecisionSchema.optional(),
  decidedBy: z.string().min(1).optional(),
  decidedAt: z.string().min(1).optional(),
  requiredPermission: z.string().min(1),
  autonomyLevel: AgentAutonomyLevelSchema,
  summary: z.string().optional(),
});

export type ApprovalLedgerEntry = z.infer<
  typeof ApprovalLedgerEntrySchema
>;

export const ApprovalLedgerSchema = z.array(ApprovalLedgerEntrySchema);
export type ApprovalLedger = z.infer<typeof ApprovalLedgerSchema>;

export const AgentLedgerSnapshotSchema = z.object({
  sourceMode: AdminDataSourceModeSchema,
  generatedAt: z.string().min(1),
  agentRuns: z.array(AgentRunSchema),
  toolInvocations: z.array(ToolInvocationSchema),
  approvalLedger: ApprovalLedgerSchema,
});

export type AgentLedgerSnapshot = z.infer<
  typeof AgentLedgerSnapshotSchema
>;

export const TraceEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'context_packet',
    'reasoning_summary',
    'tool_call',
    'permission_check',
    'guardrail',
    'approval',
    'human_decision',
    'outcome',
  ]),
  title: z.string(),
  status: z.enum(['completed', 'pending', 'warning', 'blocked', 'error']),
  timestamp: z.string(),
  summary: z.string(),
});

export type TraceEvent = z.infer<typeof TraceEventSchema>;

export const TraceDrawerSummarySchema = z.object({
  traceId: z.string().min(1),
  agentRunId: z.string().min(1),
  dataUsed: z.array(z.string()),
  sourceFreshness: z.string(),
  confidence: z.number().min(0).max(1),
  riskLevel: RiskLevelSchema,
  permissionResult: z.enum(['allowed', 'denied', 'requires_approval']),
  policyResult: z.enum(['passed', 'warning', 'blocked']),
  humanDecision: z
    .enum(['approved', 'approved_with_edits', 'rejected', 'escalated'])
    .optional(),
  auditLink: z.string(),
});

export type TraceDrawerSummary = z.infer<typeof TraceDrawerSummarySchema>;

export const ItinerarySegmentSchema = z.object({
  id: z.string().min(1),
  dayLabel: z.string(),
  title: z.string(),
  supplier: z.string(),
  status: AgenticActionStateSchema,
  priceLabel: z.string(),
  marginLabel: z.string(),
  traceId: z.string().min(1),
});

export type ItinerarySegment = z.infer<typeof ItinerarySegmentSchema>;

export const LiveFeedItemSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  detail: z.string(),
  status: AgenticActionStateSchema,
  updatedLabel: z.string(),
  marginLabel: z.string(),
  traceId: z.string().min(1),
});

export type LiveFeedItem = z.infer<typeof LiveFeedItemSchema>;

export const PlannerWorkbenchFixtureSchema = z.object({
  opportunity: PlannerOpportunitySchema,
  opportunities: z.array(PlannerOpportunitySchema),
  itinerarySegments: z.array(ItinerarySegmentSchema),
  liveFeed: z.array(LiveFeedItemSchema),
  suggestions: z.array(AgentSuggestionSchema),
  draftActions: z.array(DraftActionSchema).default([]),
  blockedStates: z.array(AgentBlockedStateSchema),
  approvals: z.array(ApprovalRequestSchema),
  traceSummary: TraceDrawerSummarySchema,
  traceEvents: z.array(TraceEventSchema),
  missingData: z.array(z.string()),
});

export type PlannerWorkbenchFixture = z.infer<typeof PlannerWorkbenchFixtureSchema>;
