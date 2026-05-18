"use client";

import type { AgentBlockedState, AgentSuggestion } from '@bukeer/admin-contract';
import { AlertTriangle, Bot, Database, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatePill } from './state-pill';

export function AgentSuggestionCard({
  suggestion,
  onInspectTrace,
  onSimulate,
}: {
  suggestion: AgentSuggestion;
  onInspectTrace: (traceId: string) => void;
  onSimulate: (message: string) => void;
}) {
  return (
    <article className="rounded-md border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-secondary" />
            <h3 className="font-semibold">{suggestion.title}</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{suggestion.proposedAction}</p>
        </div>
        <StatePill state={suggestion.state} />
      </div>
      <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">
        <div className="font-semibold">Reasoning summary</div>
        <p className="mt-1 text-muted-foreground">{suggestion.rationale}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {suggestion.dataUsed.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1">
            <Database className="size-3" />
            {item}
          </span>
        ))}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Button variant="outline" size="sm" onClick={() => onInspectTrace(suggestion.traceId)}>
          Trace
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSimulate('Suggestion accepted locally. No backend write was executed.')}
        >
          Accept draft
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSimulate('Suggestion rejected locally. Feedback capture is not wired yet.')}
        >
          Reject
        </Button>
      </div>
    </article>
  );
}

export function AgentBlockedCard({
  blocked,
  onInspectTrace,
}: {
  blocked: AgentBlockedState;
  onInspectTrace: (traceId: string) => void;
}) {
  return (
    <article className="rounded-md border border-accent/30 bg-accent/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldX className="size-4 text-muted-foreground" />
            <h3 className="font-semibold">{blocked.title}</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{blocked.reason}</p>
        </div>
        <StatePill state={blocked.state} />
      </div>
      {blocked.missingData?.length ? (
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {blocked.missingData.map((item) => (
            <span key={item} className="inline-flex items-center gap-2 rounded-md border bg-background/70 px-2 py-1.5">
              <AlertTriangle className="size-3.5 text-muted-foreground" />
              {item}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onInspectTrace(blocked.traceId)}>
          Inspect trace
        </Button>
        <span className="text-xs text-muted-foreground">
          Required: {blocked.requiredPermission ?? 'policy clearance'}
        </span>
      </div>
    </article>
  );
}
