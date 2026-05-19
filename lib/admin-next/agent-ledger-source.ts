import {
  AgentLedgerSnapshotSchema,
  type AdminDataSourceMode,
  type AgentAutonomyLevel,
  type AgentLedgerSnapshot,
  type AgentRun,
  type AgenticActionState,
  type ApprovalDecision,
  type ApprovalLedgerEntry,
  type HumanAgentUiState,
  type PlannerWorkbenchFixture,
  type RiskLevel,
  type ToolInvocation,
  type ToolInvocationStatus,
} from '@bukeer/admin-contract';

export interface PlannerAgentLedgerSnapshotOptions {
  readonly sourceMode?: AdminDataSourceMode;
  readonly generatedAt?: string;
}

export interface AgentLedgerSource {
  getSnapshot(): Promise<AgentLedgerSnapshot>;
}

type AgentSuggestion = PlannerWorkbenchFixture['suggestions'][number];
type AgentBlockedState = PlannerWorkbenchFixture['blockedStates'][number];
type ApprovalRequest = PlannerWorkbenchFixture['approvals'][number];
type ItinerarySegment = PlannerWorkbenchFixture['itinerarySegments'][number];
type LiveFeedItem = PlannerWorkbenchFixture['liveFeed'][number];
type TraceDrawerSummary = PlannerWorkbenchFixture['traceSummary'];

interface TraceLedgerContext {
  readonly traceId: string;
  readonly suggestions: AgentSuggestion[];
  readonly blockedStates: AgentBlockedState[];
  readonly approvals: ApprovalRequest[];
  readonly itinerarySegments: ItinerarySegment[];
  readonly liveFeed: LiveFeedItem[];
  traceSummary?: TraceDrawerSummary;
}

const DEFAULT_GENERATED_AT = '2026-05-18T00:00:00.000Z';
const HIDDEN_REASONING_PATTERN =
  /\b(chain[-\s]?of[-\s]?thought|hidden reasoning|internal reasoning|scratchpad|private deliberation|system prompt)\b/i;

export function createPlannerAgentLedgerSource(
  workbench: PlannerWorkbenchFixture,
  options: PlannerAgentLedgerSnapshotOptions = {},
): AgentLedgerSource {
  return {
    async getSnapshot() {
      return createPlannerAgentLedgerSnapshot(workbench, options);
    },
  };
}

export function createPlannerAgentLedgerSnapshot(
  workbench: PlannerWorkbenchFixture,
  options: PlannerAgentLedgerSnapshotOptions = {},
): AgentLedgerSnapshot {
  const sourceMode = options.sourceMode ?? 'readonly';
  const generatedAt = options.generatedAt ?? DEFAULT_GENERATED_AT;
  const contexts = collectTraceContexts(workbench);
  const runsByTraceId = new Map<string, AgentRun>();

  const agentRuns = contexts.map((context, index) => {
    const run = createAgentRun(context, generatedAt, index);
    runsByTraceId.set(context.traceId, run);
    return run;
  });

  const toolInvocations = contexts.flatMap((context, index) =>
    createToolInvocations(context, runsByTraceId.get(context.traceId)!, generatedAt, index),
  );

  const approvalLedger = contexts.flatMap((context, index) =>
    context.approvals.map((approval, approvalIndex) =>
      createApprovalLedgerEntry(
        approval,
        runsByTraceId.get(context.traceId)!,
        generatedAt,
        index,
        approvalIndex,
      ),
    ),
  );

  return AgentLedgerSnapshotSchema.parse({
    sourceMode,
    generatedAt,
    agentRuns,
    toolInvocations,
    approvalLedger,
  });
}

function collectTraceContexts(
  workbench: PlannerWorkbenchFixture,
): TraceLedgerContext[] {
  const contextsByTraceId = new Map<string, TraceLedgerContext>();

  for (const segment of workbench.itinerarySegments) {
    ensureTraceContext(contextsByTraceId, segment.traceId).itinerarySegments.push(segment);
  }

  for (const feedItem of workbench.liveFeed) {
    ensureTraceContext(contextsByTraceId, feedItem.traceId).liveFeed.push(feedItem);
  }

  for (const suggestion of workbench.suggestions) {
    ensureTraceContext(contextsByTraceId, suggestion.traceId).suggestions.push(suggestion);
  }

  for (const blockedState of workbench.blockedStates) {
    ensureTraceContext(contextsByTraceId, blockedState.traceId).blockedStates.push(blockedState);
  }

  for (const approval of workbench.approvals) {
    ensureTraceContext(contextsByTraceId, approval.traceId).approvals.push(approval);
  }

  ensureTraceContext(contextsByTraceId, workbench.traceSummary.traceId).traceSummary =
    workbench.traceSummary;

  return [...contextsByTraceId.values()];
}

function ensureTraceContext(
  contextsByTraceId: Map<string, TraceLedgerContext>,
  traceId: string,
): TraceLedgerContext {
  const existing = contextsByTraceId.get(traceId);

  if (existing) return existing;

  const context: TraceLedgerContext = {
    traceId,
    suggestions: [],
    blockedStates: [],
    approvals: [],
    itinerarySegments: [],
    liveFeed: [],
  };
  contextsByTraceId.set(traceId, context);
  return context;
}

function createAgentRun(
  context: TraceLedgerContext,
  generatedAt: string,
  index: number,
): AgentRun {
  const approval = context.approvals[0];
  const blockedState = context.blockedStates[0];
  const suggestion = context.suggestions[0];
  const segment = context.itinerarySegments[0];
  const feedItem = context.liveFeed[0];
  const startedAt = timestampAt(generatedAt, index * 10);
  let actionState: AgenticActionState;
  let title: string;
  let summary: string;
  let uiState: HumanAgentUiState;
  let autonomyLevel: AgentAutonomyLevel;
  let id: string;

  if (approval) {
    actionState = approval.state;
    title = `Review approval: ${safeVisibleText(
      approval.proposedAction,
      'planner approval request',
    )}`;
    summary = buildApprovalRunSummary(approval);
    uiState = uiStateForActionState(actionState);
    autonomyLevel = 'A3_confirmed_write';
    id = approval.agentRunId;
  } else if (blockedState) {
    actionState = blockedState.state;
    title = safeVisibleText(blockedState.title, 'Blocked planner operation');
    summary = buildBlockedRunSummary(blockedState);
    uiState = 'ai_blocked';
    autonomyLevel = 'A0_readonly';
    id = `run-${slugify(blockedState.id)}`;
  } else if (suggestion) {
    actionState = suggestion.state;
    title = safeVisibleText(suggestion.title, 'Planner suggestion');
    summary = buildSuggestionRunSummary(suggestion);
    uiState = uiStateForActionState(actionState);
    autonomyLevel = suggestion.autonomyLevel;
    id = `run-${slugify(suggestion.id)}`;
  } else if (segment) {
    actionState = segment.status;
    title = safeVisibleText(segment.title, 'Readonly itinerary segment');
    summary = `Readonly itinerary context shows ${safeVisibleText(
      segment.title,
      'this segment',
    )} as ${formatState(segment.status)}.`;
    uiState = uiStateForActionState(actionState);
    autonomyLevel = 'A0_readonly';
    id = `run-${slugify(segment.id)}`;
  } else if (feedItem) {
    actionState = feedItem.status;
    title = safeVisibleText(feedItem.title, 'Readonly live feed item');
    summary = `Readonly live feed shows ${safeVisibleText(
      feedItem.title,
      'this item',
    )} as ${formatState(feedItem.status)}.`;
    uiState = uiStateForActionState(actionState);
    autonomyLevel = 'A0_readonly';
    id = `run-${slugify(feedItem.id)}`;
  } else {
    actionState = actionStateForTraceSummary(context.traceSummary);
    title = 'Trace summary';
    summary = `Readonly trace summary is ${formatState(actionState)}.`;
    uiState = uiStateForActionState(actionState);
    autonomyLevel = 'A0_readonly';
    id = context.traceSummary?.agentRunId ?? `run-${slugify(context.traceId)}`;
  }

  return {
    id,
    traceId: context.traceId,
    title,
    summary,
    uiState,
    actionState,
    autonomyLevel,
    startedAt,
    completedAt: isPendingActionState(actionState)
      ? undefined
      : timestampAt(generatedAt, index * 10 + 1),
  };
}

function createToolInvocations(
  context: TraceLedgerContext,
  agentRun: AgentRun,
  generatedAt: string,
  contextIndex: number,
): ToolInvocation[] {
  const tools: ToolInvocation[] = [];
  let toolIndex = 0;

  for (const segment of context.itinerarySegments) {
    tools.push(
      createToolInvocation({
        id: `tool-${slugify(segment.id)}-itinerary-read`,
        agentRunId: agentRun.id,
        traceId: context.traceId,
        toolName: 'readonly_itinerary_context',
        status: toolStatusForActionState(segment.status),
        riskLevel: riskForActionState(segment.status),
        resultSummary: `Readonly itinerary item ${safeVisibleText(
          segment.title,
          'segment',
        )} is ${formatState(segment.status)} with ${safeVisibleText(
          segment.supplier,
          'supplier context',
        )}.`,
        generatedAt,
        offsetMinutes: contextIndex * 10 + toolIndex + 2,
      }),
    );
    toolIndex += 1;
  }

  for (const feedItem of context.liveFeed) {
    tools.push(
      createToolInvocation({
        id: `tool-${slugify(feedItem.id)}-feed-read`,
        agentRunId: agentRun.id,
        traceId: context.traceId,
        toolName: 'readonly_live_feed_context',
        status: toolStatusForActionState(feedItem.status),
        riskLevel: riskForActionState(feedItem.status),
        resultSummary: `Readonly feed summary for ${safeVisibleText(
          feedItem.title,
          'feed item',
        )}: ${safeVisibleText(feedItem.detail, 'feed detail was summarized')}.`,
        generatedAt,
        offsetMinutes: contextIndex * 10 + toolIndex + 2,
      }),
    );
    toolIndex += 1;
  }

  for (const suggestion of context.suggestions) {
    tools.push(
      createToolInvocation({
        id: `tool-${slugify(suggestion.id)}-suggestion`,
        agentRunId: agentRun.id,
        traceId: context.traceId,
        toolName: 'readonly_suggestion_context',
        status: toolStatusForActionState(suggestion.state),
        riskLevel: suggestion.riskLevel,
        inputSummary: `Data used: ${joinVisibleList(suggestion.dataUsed, 'planner context')}.`,
        resultSummary: `Suggestion summary: ${safeVisibleText(
          suggestion.proposedAction,
          suggestion.title,
        )}.`,
        generatedAt,
        offsetMinutes: contextIndex * 10 + toolIndex + 2,
      }),
    );
    toolIndex += 1;
  }

  for (const blockedState of context.blockedStates) {
    tools.push(
      createToolInvocation({
        id: `tool-${slugify(blockedState.id)}-guardrail`,
        agentRunId: agentRun.id,
        traceId: context.traceId,
        toolName: 'readonly_guardrail_check',
        status: 'blocked',
        riskLevel: riskForBlockedState(blockedState),
        inputSummary: `Missing data: ${joinVisibleList(
          blockedState.missingData ?? [],
          'none listed',
        )}.`,
        resultSummary: `Guardrail summary: ${safeVisibleText(
          blockedState.reason,
          'planner operation remains blocked',
        )}.`,
        generatedAt,
        offsetMinutes: contextIndex * 10 + toolIndex + 2,
      }),
    );
    toolIndex += 1;
  }

  for (const approval of context.approvals) {
    tools.push(
      createToolInvocation({
        id: `tool-${slugify(approval.id)}-approval-context`,
        agentRunId: agentRun.id,
        traceId: context.traceId,
        toolName: 'readonly_approval_context',
        status: approvalToolStatus(approval),
        riskLevel: riskForApproval(approval),
        inputSummary: `Approval requires ${safeVisibleText(
          approval.requiredPermission,
          'required permission',
        )}.`,
        resultSummary: `Approval summary: ${safeVisibleText(
          approval.proposedAction,
          'planner approval request',
        )}.`,
        generatedAt,
        offsetMinutes: contextIndex * 10 + toolIndex + 2,
      }),
    );
    toolIndex += 1;
  }

  return tools;
}

function createToolInvocation({
  id,
  agentRunId,
  traceId,
  toolName,
  status,
  riskLevel,
  inputSummary,
  resultSummary,
  generatedAt,
  offsetMinutes,
}: {
  readonly id: string;
  readonly agentRunId: string;
  readonly traceId: string;
  readonly toolName: string;
  readonly status: ToolInvocationStatus;
  readonly riskLevel: RiskLevel;
  readonly inputSummary?: string;
  readonly resultSummary: string;
  readonly generatedAt: string;
  readonly offsetMinutes: number;
}): ToolInvocation {
  const requestedAt = timestampAt(generatedAt, offsetMinutes);

  return {
    id,
    agentRunId,
    traceId,
    toolName,
    status,
    autonomyLevel: 'A0_readonly',
    riskLevel,
    requestedAt,
    completedAt:
      status === 'requested' || status === 'running'
        ? undefined
        : timestampAt(generatedAt, offsetMinutes + 1),
    inputSummary,
    resultSummary,
  };
}

function createApprovalLedgerEntry(
  approval: ApprovalRequest,
  agentRun: AgentRun,
  generatedAt: string,
  contextIndex: number,
  approvalIndex: number,
): ApprovalLedgerEntry {
  const decision = approvalDecisionForState(approval.state);

  return {
    id: `approval-ledger-${slugify(approval.id)}`,
    approvalRequestId: approval.id,
    agentRunId: approval.agentRunId || agentRun.id,
    traceId: approval.traceId,
    state: approval.state,
    decision,
    decidedAt:
      approval.state === 'approval_required'
        ? undefined
        : timestampAt(generatedAt, contextIndex * 10 + approvalIndex + 8),
    requiredPermission: approval.requiredPermission,
    autonomyLevel: 'A3_confirmed_write',
    summary: buildApprovalLedgerSummary(approval),
  };
}

function buildSuggestionRunSummary(suggestion: AgentSuggestion): string {
  const proposedAction = safeVisibleText(
    suggestion.proposedAction,
    suggestion.title,
  );
  const rationale = optionalVisibleText(suggestion.rationale);
  const freshness = optionalVisibleText(suggestion.sourceFreshness);
  const details = [rationale, freshness ? `Source freshness: ${freshness}` : undefined]
    .filter(Boolean)
    .join(' ');

  return `Suggestion prepared: ${proposedAction}.${details ? ` ${details}` : ''}`;
}

function buildBlockedRunSummary(blockedState: AgentBlockedState): string {
  const missingData = joinVisibleList(blockedState.missingData ?? [], 'none listed');
  const escalation = optionalVisibleText(blockedState.escalationPath);

  return `Blocked: ${safeVisibleText(
    blockedState.reason,
    'planner operation remains blocked',
  )}. Missing data: ${missingData}.${escalation ? ` Escalation: ${escalation}.` : ''}`;
}

function buildApprovalRunSummary(approval: ApprovalRequest): string {
  return `${formatState(approval.state)} for ${safeVisibleText(
    approval.requiredPermission,
    'required permission',
  )}: ${safeVisibleText(
    approval.proposedAction,
    'planner approval request',
  )}. Missing data: ${joinVisibleList(approval.missingData, 'none listed')}.`;
}

function buildApprovalLedgerSummary(approval: ApprovalRequest): string {
  const riskFlags = joinVisibleList(approval.riskFlags, 'none listed');

  return `${formatState(approval.state)} for ${safeVisibleText(
    approval.requiredPermission,
    'required permission',
  )}. Risk flags: ${riskFlags}.`;
}

function actionStateForTraceSummary(
  summary: TraceDrawerSummary | undefined,
): AgenticActionState {
  if (!summary) return 'observed';
  if (summary.policyResult === 'blocked') return 'blocked_policy';
  if (summary.permissionResult === 'requires_approval') return 'approval_required';
  if (summary.permissionResult === 'denied') return 'rejected';
  return 'observed';
}

function uiStateForActionState(actionState: AgenticActionState): HumanAgentUiState {
  switch (actionState) {
    case 'suggested':
    case 'drafted':
      return 'ai_suggestion';
    case 'blocked_missing_data':
    case 'blocked_policy':
    case 'expired':
      return 'ai_blocked';
    case 'approval_required':
      return 'approval_required';
    case 'approved':
      return 'approved';
    case 'executing':
      return 'executing';
    case 'executed':
      return 'executed';
    case 'rejected':
      return 'rejected';
    case 'observed':
    default:
      return 'trace_available';
  }
}

function toolStatusForActionState(
  actionState: AgenticActionState,
): ToolInvocationStatus {
  switch (actionState) {
    case 'blocked_missing_data':
    case 'blocked_policy':
    case 'rejected':
    case 'expired':
      return 'blocked';
    case 'approval_required':
    case 'executing':
      return 'requested';
    default:
      return 'completed';
  }
}

function approvalToolStatus(approval: ApprovalRequest): ToolInvocationStatus {
  return approval.state === 'approved' ? 'completed' : 'blocked';
}

function riskForActionState(actionState: AgenticActionState): RiskLevel {
  switch (actionState) {
    case 'blocked_missing_data':
    case 'blocked_policy':
    case 'rejected':
      return 'high';
    case 'approval_required':
    case 'expired':
    case 'executing':
      return 'medium';
    default:
      return 'low';
  }
}

function riskForBlockedState(blockedState: AgentBlockedState): RiskLevel {
  if (blockedState.requiredPermission || blockedState.policyKey) return 'high';
  if ((blockedState.missingData ?? []).length > 0) return 'medium';
  return 'low';
}

function riskForApproval(approval: ApprovalRequest): RiskLevel {
  if (approval.state === 'rejected') return 'high';
  if (approval.riskFlags.length > 0 || approval.missingData.length > 0) return 'high';
  if (approval.state === 'approval_required' || approval.state === 'expired') {
    return 'medium';
  }
  return 'low';
}

function approvalDecisionForState(
  state: ApprovalRequest['state'],
): ApprovalDecision | undefined {
  switch (state) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    default:
      return undefined;
  }
}

function isPendingActionState(actionState: AgenticActionState): boolean {
  return actionState === 'approval_required' || actionState === 'executing';
}

function optionalVisibleText(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/\s+/g, ' ');

  if (!trimmed || HIDDEN_REASONING_PATTERN.test(trimmed)) return undefined;

  return trimmed;
}

function safeVisibleText(value: string | undefined, fallback: string): string {
  return optionalVisibleText(value) ?? fallback;
}

function joinVisibleList(values: readonly string[], fallback: string): string {
  const visibleValues = [...new Set(values.map(optionalVisibleText).filter(Boolean))];

  return visibleValues.length > 0 ? visibleValues.join(', ') : fallback;
}

function formatState(value: string): string {
  return value.replaceAll('_', ' ');
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'ledger-entry';
}

function timestampAt(generatedAt: string, offsetMinutes: number): string {
  const base = new Date(generatedAt);

  if (Number.isNaN(base.getTime())) return generatedAt;

  return new Date(base.getTime() + offsetMinutes * 60_000).toISOString();
}
