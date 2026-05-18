"use client";

import type { ApprovalRequest } from '@bukeer/admin-contract';
import { AlertTriangle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatePill } from './state-pill';

export function ApprovalCommandBar({
  approval,
  onInspectTrace,
  onSimulate,
}: {
  approval: ApprovalRequest;
  onInspectTrace: (traceId: string) => void;
  onSimulate: (message: string) => void;
}) {
  return (
    <div className="sticky bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-md border border-accent/30 bg-accent/10 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatePill state={approval.state} />
            <span className="font-semibold">{approval.proposedAction}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <LockKeyhole className="size-3.5" />
              {approval.requiredPermission}
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3.5" />
              {approval.requiredApprover}
            </span>
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="size-3.5" />
              {approval.riskFlags.join(', ')}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button variant="outline" size="sm" onClick={() => onInspectTrace(approval.traceId)}>
            Trace
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSimulate('Approve with edits simulated locally. No write was sent.')}
          >
            Edit approval
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSimulate('Approval rejected locally. No workflow execution was triggered.')}
          >
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => onSimulate('Approval simulated locally. Execution remains disabled in this prototype.')}
          >
            Approve once
          </Button>
        </div>
      </div>
    </div>
  );
}
