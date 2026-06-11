"use client";

import { CheckCircle2, CircleDollarSign, ListChecks, ShieldAlert } from 'lucide-react';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';

export function MissingDataChecklist({ items }: { items: string[] }) {
  return (
    <section className="rounded-md border bg-background p-4">
      <div className="flex items-center gap-2">
        <ListChecks className="size-4 text-accent" />
        <h3 className="font-semibold">{adminNextCopy.workflow.missingDataTitle}</h3>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <ShieldAlert className="size-3.5 text-muted-foreground" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MarginGuardPanel({
  current,
  target,
  revenue,
  cost,
  profit,
}: {
  current: string;
  target: string;
  revenue: string;
  cost: string;
  profit: string;
}) {
  return (
    <section className="rounded-md border bg-background p-4">
      <div className="flex items-center gap-2">
        <CircleDollarSign className="size-4 text-accent" />
        <h3 className="font-semibold">{adminNextCopy.workflow.marginGuardTitle}</h3>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Metric label={adminNextCopy.workflow.revenueLabel} value={revenue} />
        <Metric label={adminNextCopy.workflow.costLabel} value={cost} />
        <Metric label={adminNextCopy.workflow.profitLabel} value={profit} />
      </div>
      <div className="mt-3 rounded-md border border-accent/30 bg-accent/10 p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold">{adminNextCopy.workflow.currentMarginLabel}</span>
          <span className="font-semibold">{current}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{adminNextCopy.workflow.targetLabel}</span>
          <span>{target}</span>
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="mt-0.5 size-3.5 text-secondary" />
        <span>{adminNextCopy.workflow.recoveryHint}</span>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
