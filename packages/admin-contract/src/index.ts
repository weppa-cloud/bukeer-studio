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

export const AdminPermissionSchema = z.enum([
  'admin_next.view',
  'planner.view',
  'planner.suggest',
  'planner.approve',
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
  blockedStates: z.array(AgentBlockedStateSchema),
  approvals: z.array(ApprovalRequestSchema),
  traceSummary: TraceDrawerSummarySchema,
  traceEvents: z.array(TraceEventSchema),
  missingData: z.array(z.string()),
});

export type PlannerWorkbenchFixture = z.infer<typeof PlannerWorkbenchFixtureSchema>;
