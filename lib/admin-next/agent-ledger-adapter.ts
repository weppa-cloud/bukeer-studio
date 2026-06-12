import {
  TraceDrawerSummarySchema,
  TraceEventSchema,
  type AgentLedgerSnapshot,
  type ApprovalDecision,
  type ApprovalLedgerEntry,
  type RiskLevel,
  type ToolInvocation,
  type ToolInvocationStatus,
  type TraceDrawerSummary,
  type TraceEvent,
} from '@bukeer/admin-contract';

export interface AgentLedgerTrace {
  readonly summary: TraceDrawerSummary;
  readonly events: TraceEvent[];
}

export interface AgentLedgerTraceOptions {
  readonly auditBasePath?: string;
}

const DEFAULT_AUDIT_BASE_PATH = '/admin/prototype/planner-workbench';
const FALLBACK_CONFIDENCE = 0.78;
const HIDDEN_REASONING_PATTERN =
  /\b(chain[-\s]?of[-\s]?thought|hidden reasoning|internal reasoning|scratchpad|private deliberation|system prompt)\b/i;

type TraceStatus = TraceEvent['status'];

export function mapAgentLedgerToTrace(
  snapshot: AgentLedgerSnapshot,
  traceId: string,
  options: AgentLedgerTraceOptions = {},
): AgentLedgerTrace {
  const agentRun = snapshot.agentRuns.find((run) => run.traceId === traceId);
  const toolInvocations = snapshot.toolInvocations.filter((tool) => tool.traceId === traceId);
  const approvalLedger = snapshot.approvalLedger.filter((approval) => approval.traceId === traceId);
  const agentRunId =
    agentRun?.id ?? toolInvocations[0]?.agentRunId ?? approvalLedger[0]?.agentRunId;

  if (!agentRunId) {
    throw new Error(`No agent ledger entries found for trace "${traceId}".`);
  }

  const events = [
    ...(agentRun ? [agentRunToEvent(agentRun)] : []),
    ...toolInvocations
      .slice()
      .sort(compareToolInvocations)
      .map(toolInvocationToEvent),
    ...approvalLedger
      .slice()
      .sort(compareApprovalLedger)
      .map(approvalLedgerToEvent),
  ].map((event) => TraceEventSchema.parse(event));

  const summary = TraceDrawerSummarySchema.parse({
    traceId,
    agentRunId,
    dataUsed: buildDataUsed(agentRun?.title, toolInvocations, approvalLedger),
    sourceFreshness: buildSourceFreshness(snapshot, agentRun, toolInvocations, approvalLedger),
    confidence: deriveConfidence(events),
    riskLevel: deriveRiskLevel(toolInvocations, approvalLedger),
    permissionResult: derivePermissionResult(approvalLedger),
    policyResult: derivePolicyResult(events, toolInvocations, approvalLedger),
    humanDecision: latestApprovalDecision(approvalLedger),
    auditLink: `${options.auditBasePath ?? DEFAULT_AUDIT_BASE_PATH}#${traceId}`,
  });

  return { summary, events };
}

function agentRunToEvent(agentRun: AgentLedgerSnapshot['agentRuns'][number]): TraceEvent {
  return {
    id: `${agentRun.id}:summary`,
    type: 'reasoning_summary',
    title: agentRun.title,
    status: agentActionStateToTraceStatus(agentRun.actionState),
    timestamp: formatTraceTimestamp(agentRun.completedAt ?? agentRun.startedAt),
    summary: safeLedgerSummary(
      agentRun.summary,
      `Agent run ${agentRun.id} is ${agentRun.actionState.replaceAll('_', ' ')}.`,
    ),
  };
}

function toolInvocationToEvent(tool: ToolInvocation): TraceEvent {
  return {
    id: tool.id,
    type: 'tool_call',
    title: formatToolName(tool.toolName),
    status: toolInvocationStatusToTraceStatus(tool.status),
    timestamp: formatTraceTimestamp(tool.completedAt ?? tool.requestedAt),
    summary: safeLedgerSummary(
      tool.resultSummary ?? tool.inputSummary,
      `Tool ${tool.toolName} ${tool.status}. Result summary withheld for safety.`,
    ),
  };
}

function approvalLedgerToEvent(approval: ApprovalLedgerEntry): TraceEvent {
  return {
    id: approval.id,
    type: approval.decision ? 'human_decision' : 'approval',
    title: approvalTitle(approval),
    status: approvalLedgerStatusToTraceStatus(approval),
    timestamp: formatTraceTimestamp(approval.decidedAt),
    summary: safeLedgerSummary(
      approval.summary,
      `Approval ${approval.approvalRequestId} is ${approval.state.replaceAll(
        '_',
        ' ',
      )} for ${approval.requiredPermission}.`,
    ),
  };
}

function buildDataUsed(
  agentRunTitle: string | undefined,
  toolInvocations: ToolInvocation[],
  approvalLedger: ApprovalLedgerEntry[],
): string[] {
  const labels = new Set<string>();

  if (agentRunTitle) {
    labels.add(`Agent run: ${agentRunTitle}`);
  }

  for (const tool of toolInvocations) {
    labels.add(`Tool: ${formatToolName(tool.toolName)}`);
  }

  for (const approval of approvalLedger) {
    labels.add(`Approval: ${approval.requiredPermission}`);
  }

  return labels.size > 0 ? [...labels] : ['Agent ledger'];
}

function buildSourceFreshness(
  snapshot: AgentLedgerSnapshot,
  agentRun: AgentLedgerSnapshot['agentRuns'][number] | undefined,
  toolInvocations: ToolInvocation[],
  approvalLedger: ApprovalLedgerEntry[],
): string {
  const timestamps = [
    snapshot.generatedAt,
    agentRun?.completedAt,
    agentRun?.startedAt,
    ...toolInvocations.flatMap((tool) => [tool.completedAt, tool.requestedAt]),
    ...approvalLedger.map((approval) => approval.decidedAt),
  ].filter(Boolean) as string[];
  const newestTimestamp = timestamps.sort().at(-1);

  return newestTimestamp
    ? `Newest ledger entry at ${newestTimestamp}`
    : `Ledger generated at ${snapshot.generatedAt}`;
}

function deriveConfidence(events: TraceEvent[]): number {
  if (events.some((event) => event.status === 'error')) {
    return 0.42;
  }

  if (events.some((event) => event.status === 'blocked')) {
    return 0.56;
  }

  if (events.some((event) => event.status === 'warning')) {
    return 0.68;
  }

  if (events.some((event) => event.status === 'pending')) {
    return 0.74;
  }

  return FALLBACK_CONFIDENCE;
}

function deriveRiskLevel(
  toolInvocations: ToolInvocation[],
  approvalLedger: ApprovalLedgerEntry[],
): RiskLevel {
  const toolRisk = maxRisk(
    toolInvocations.map((tool) => tool.riskLevel).filter(Boolean) as RiskLevel[],
  );

  if (toolRisk) {
    return toolRisk;
  }

  if (approvalLedger.some((approval) => approval.state === 'rejected')) {
    return 'high';
  }

  if (approvalLedger.some((approval) => approval.state === 'approval_required')) {
    return 'medium';
  }

  if (approvalLedger.some((approval) => approval.state === 'expired')) {
    return 'medium';
  }

  return 'low';
}

function derivePermissionResult(
  approvalLedger: ApprovalLedgerEntry[],
): TraceDrawerSummary['permissionResult'] {
  if (approvalLedger.some((approval) => approval.state === 'rejected')) {
    return 'denied';
  }

  if (approvalLedger.some((approval) => approval.state === 'approval_required')) {
    return 'requires_approval';
  }

  if (approvalLedger.some((approval) => approval.state === 'expired')) {
    return 'requires_approval';
  }

  return 'allowed';
}

function derivePolicyResult(
  events: TraceEvent[],
  toolInvocations: ToolInvocation[],
  approvalLedger: ApprovalLedgerEntry[],
): TraceDrawerSummary['policyResult'] {
  if (
    events.some((event) => event.status === 'error' || event.status === 'blocked') ||
    approvalLedger.some((approval) => approval.state === 'rejected') ||
    toolInvocations.some((tool) => tool.riskLevel === 'critical')
  ) {
    return 'blocked';
  }

  if (
    events.some((event) => event.status === 'pending' || event.status === 'warning') ||
    approvalLedger.some(
      (approval) => approval.state === 'approval_required' || approval.state === 'expired',
    ) ||
    toolInvocations.some((tool) => tool.riskLevel === 'high')
  ) {
    return 'warning';
  }

  return 'passed';
}

function latestApprovalDecision(
  approvalLedger: ApprovalLedgerEntry[],
): ApprovalDecision | undefined {
  return approvalLedger
    .filter((approval) => approval.decision)
    .sort(compareApprovalLedger)
    .at(-1)?.decision;
}

function approvalTitle(approval: ApprovalLedgerEntry): string {
  if (approval.decision) {
    return `Human decision: ${approval.decision.replaceAll('_', ' ')}`;
  }

  if (approval.state === 'approval_required') {
    return 'Approval required';
  }

  return `Approval ${approval.state.replaceAll('_', ' ')}`;
}

function agentActionStateToTraceStatus(
  actionState: AgentLedgerSnapshot['agentRuns'][number]['actionState'],
): TraceStatus {
  switch (actionState) {
    case 'executed':
    case 'suggested':
    case 'drafted':
      return 'completed';
    case 'approval_required':
      return 'pending';
    case 'blocked_missing_data':
    case 'blocked_policy':
      return 'blocked';
    case 'expired':
      return 'warning';
    default:
      return 'warning';
  }
}

function toolInvocationStatusToTraceStatus(status: ToolInvocationStatus): TraceStatus {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'requested':
    case 'running':
      return 'pending';
    case 'blocked':
      return 'blocked';
    case 'failed':
      return 'error';
    default:
      return 'warning';
  }
}

function approvalLedgerStatusToTraceStatus(approval: ApprovalLedgerEntry): TraceStatus {
  if (approval.decision === 'rejected') {
    return 'blocked';
  }

  if (approval.decision === 'escalated') {
    return 'warning';
  }

  switch (approval.state) {
    case 'approved':
      return 'completed';
    case 'approval_required':
      return 'pending';
    case 'rejected':
      return 'blocked';
    case 'expired':
      return 'warning';
    default:
      return 'warning';
  }
}

function safeLedgerSummary(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();

  if (!trimmed || HIDDEN_REASONING_PATTERN.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function formatToolName(toolName: string): string {
  return toolName
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replaceAll('Whatsapp', 'WhatsApp');
}

function formatTraceTimestamp(value: string | undefined): string {
  if (!value) {
    return 'pending';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(11, 16);
}

function compareToolInvocations(a: ToolInvocation, b: ToolInvocation): number {
  return timestampForSort(a.completedAt ?? a.requestedAt).localeCompare(
    timestampForSort(b.completedAt ?? b.requestedAt),
  );
}

function compareApprovalLedger(a: ApprovalLedgerEntry, b: ApprovalLedgerEntry): number {
  return timestampForSort(a.decidedAt).localeCompare(timestampForSort(b.decidedAt));
}

function timestampForSort(value: string | undefined): string {
  return value ?? '';
}

function maxRisk(risks: RiskLevel[]): RiskLevel | undefined {
  const order: Record<RiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };

  return risks.reduce<RiskLevel | undefined>((highest, risk) => {
    if (!highest || order[risk] > order[highest]) {
      return risk;
    }

    return highest;
  }, undefined);
}
