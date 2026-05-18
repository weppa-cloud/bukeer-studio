"use client";

import type { TraceDrawerSummary, TraceEvent } from '@bukeer/admin-contract';
import { Activity, Database, ExternalLink, ShieldCheck } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { StatePill } from './state-pill';

export function TraceDrawer({
  open,
  onOpenChange,
  summary,
  events,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: TraceDrawerSummary;
  events: TraceEvent[];
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl" side="right">
        <SheetHeader className="border-b">
          <SheetTitle>Agent trace</SheetTitle>
          <SheetDescription>
            Reasoning summary, evidence, tool results and approval state. Hidden chain-of-thought is not shown.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto p-4">
          <TraceSummary summary={summary} />
          <TraceTimeline events={events} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function TraceTimeline({ events }: { events: TraceEvent[] }) {
  return (
    <section className="rounded-md border bg-background">
      <div className="border-b px-4 py-3">
        <div className="text-sm font-semibold">Trace timeline</div>
      </div>
      <div className="divide-y">
        {events.map((event) => (
          <article key={event.id} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 px-4 py-3">
            <div className="text-xs font-semibold text-muted-foreground">{event.timestamp}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-semibold">{event.title}</div>
                <TraceStatus status={event.status} />
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {event.type.replaceAll('_', ' ')}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{event.summary}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TraceSummary({ summary }: { summary: TraceDrawerSummary }) {
  return (
    <section className="rounded-md border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {summary.traceId}
          </div>
          <h3 className="mt-1 font-semibold">Run {summary.agentRunId}</h3>
        </div>
        <StatePill state="trace_available" />
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <SummaryMetric icon={<Activity className="size-3.5" />} label="Confidence" value={`${Math.round(summary.confidence * 100)}%`} />
        <SummaryMetric icon={<ShieldCheck className="size-3.5" />} label="Permission" value={summary.permissionResult} />
        <SummaryMetric icon={<ShieldCheck className="size-3.5" />} label="Policy" value={summary.policyResult} />
        <SummaryMetric icon={<ExternalLink className="size-3.5" />} label="Audit" value={summary.auditLink} />
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Database className="size-4" />
          Data used
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.dataUsed.map((item) => (
            <span key={item} className="rounded-md border bg-muted px-2 py-1 text-xs text-muted-foreground">
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 break-words text-xs font-semibold">{value}</div>
    </div>
  );
}

function TraceStatus({ status }: { status: TraceEvent['status'] }) {
  const state =
    status === 'completed'
      ? 'executed'
      : status === 'pending'
        ? 'approval_required'
        : status === 'blocked'
          ? 'blocked_policy'
          : status === 'warning'
            ? 'expired'
            : 'error';

  return <StatePill state={state} />;
}
