"use client";

import type { AgenticActionState, HumanAgentUiState } from '@bukeer/admin-contract';
import { cn } from '@/lib/utils';

type StateTone = 'structural' | 'live' | 'human' | 'blocked' | 'success' | 'warning' | 'neutral';

const STATE_TONE: Record<AgenticActionState | HumanAgentUiState, StateTone> = {
  normal: 'neutral',
  loading: 'live',
  empty: 'neutral',
  error: 'blocked',
  no_permission: 'blocked',
  ai_suggestion: 'live',
  ai_blocked: 'human',
  approval_required: 'human',
  trace_available: 'live',
  observed: 'neutral',
  suggested: 'live',
  drafted: 'structural',
  blocked_missing_data: 'human',
  blocked_policy: 'blocked',
  approved: 'success',
  executing: 'live',
  executed: 'success',
  rejected: 'blocked',
  expired: 'warning',
};

const TONE_CLASS: Record<StateTone, string> = {
  structural: 'border-primary/30 bg-primary/10 text-primary',
  live: 'border-secondary/40 bg-secondary/15 text-foreground',
  human: 'border-accent/40 bg-accent/15 text-foreground',
  blocked: 'border-destructive/30 bg-destructive/10 text-destructive',
  success: 'border-secondary/40 bg-secondary/20 text-foreground',
  warning: 'border-accent/30 bg-accent/10 text-foreground',
  neutral: 'border-border bg-muted text-muted-foreground',
};

const STATE_LABEL: Record<AgenticActionState | HumanAgentUiState, string> = {
  normal: 'Normal',
  loading: 'Loading',
  empty: 'Empty',
  error: 'Error',
  no_permission: 'No permission',
  ai_suggestion: 'AI suggestion',
  ai_blocked: 'AI blocked',
  approval_required: 'Approval required',
  approved: 'Approved',
  rejected: 'Rejected',
  executing: 'Executing',
  executed: 'Executed',
  trace_available: 'Trace available',
  observed: 'Observed',
  suggested: 'Suggested',
  drafted: 'Drafted',
  blocked_missing_data: 'Missing data',
  blocked_policy: 'Policy blocked',
  expired: 'Expired',
};

export function stateLabel(state: AgenticActionState | HumanAgentUiState): string {
  return STATE_LABEL[state] ?? state;
}

export function StatePill({
  state,
  className,
}: {
  state: AgenticActionState | HumanAgentUiState;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-semibold',
        TONE_CLASS[STATE_TONE[state] ?? 'neutral'],
        className,
      )}
    >
      {stateLabel(state)}
    </span>
  );
}
