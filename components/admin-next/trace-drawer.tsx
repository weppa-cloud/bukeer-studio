"use client";

import type { ReactNode } from 'react';
import type {
  AgenticActionState,
  TraceDrawerSummary,
  TraceEvent,
} from '@bukeer/admin-contract';
import {
  Activity,
  BrainCircuit,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  LockKeyhole,
  Route,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  SignatureStatePill,
  type SignatureTone,
  signatureToneForStatus,
} from './signature-ui';

type TraceDrawerAppearance = 'light' | 'dark';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function TraceDrawer({
  open,
  onOpenChange,
  summary,
  events,
  appearance = 'light',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: TraceDrawerSummary;
  events: TraceEvent[];
  appearance?: TraceDrawerAppearance;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cx(
          'bukeer-admin-signature w-full gap-0 overflow-hidden border-l border-[hsl(var(--bukeer-structural)/0.22)] bg-[hsl(var(--bukeer-surface-rail))] p-0 text-foreground shadow-2xl sm:max-w-[580px] lg:max-w-[640px]',
          appearance === 'dark' && 'dark'
        )}
        data-appearance={appearance}
        data-testid="trace-drawer-content"
        showCloseButton={false}
        side="right"
        style={{ colorScheme: appearance }}
      >
        <SheetHeader className="sticky top-0 z-10 border-b border-[hsl(var(--bukeer-structural)/0.18)] bg-[hsl(var(--bukeer-surface-rail)/0.96)] px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <SignatureStatePill tone="structural">Inspector</SignatureStatePill>
                <SignatureStatePill tone="live">Trace available</SignatureStatePill>
              </div>
              <SheetTitle className="mt-3 text-xl font-semibold tracking-normal">
                Agent trace
              </SheetTitle>
              <SheetDescription className="mt-1 max-w-lg text-sm text-muted-foreground">
                Human-visible audit of evidence, tool results and approval state. Hidden
                chain-of-thought is not shown.
              </SheetDescription>
            </div>
            <SheetClose
              render={
                <button
                  type="button"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-[hsl(var(--bukeer-surface-panel))] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                />
              }
            >
              <X className="size-4" />
              <span className="sr-only">Close trace drawer</span>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <TraceSummary summary={summary} />
          <TraceGovernance summary={summary} />
          <TraceTimeline events={events} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function TraceTimeline({ events }: { events: TraceEvent[] }) {
  return (
    <section className="rounded-lg border border-border bg-[hsl(var(--bukeer-surface-panel))] shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-[hsl(var(--bukeer-surface-panel-strong))] px-4 py-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Audit sequence
          </div>
          <div className="mt-1 text-sm font-semibold">Trace timeline</div>
        </div>
        <Clock3 className="size-4 text-[hsl(var(--bukeer-structural))]" />
      </div>

      <div className="relative space-y-3 p-4 before:absolute before:bottom-5 before:left-[29px] before:top-5 before:w-px before:bg-[hsl(var(--bukeer-trace-line))]">
        {events.map((event) => {
          const tone = traceToneForEvent(event.status);
          return (
            <article
              key={event.id}
              className="relative grid grid-cols-[42px_minmax(0,1fr)] gap-3"
            >
              <div className="relative z-10 flex flex-col items-center">
                <span className={cx('mt-1 size-3 rounded-full ring-4 ring-background', dotClass(tone))} />
                <span className="mt-3 text-[11px] font-semibold text-muted-foreground">
                  {event.timestamp}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 font-semibold">{event.title}</div>
                  <SignatureStatePill tone={tone}>{event.status}</SignatureStatePill>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <Route className="size-3" />
                  {event.type.replaceAll('_', ' ')}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{event.summary}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TraceSummary({ summary }: { summary: TraceDrawerSummary }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[hsl(var(--bukeer-live)/0.28)] bg-[hsl(var(--bukeer-surface-panel))] shadow-sm">
      <div className="border-b border-[hsl(var(--bukeer-live)/0.18)] bg-[hsl(var(--bukeer-live)/0.07)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--bukeer-live))]">
              <BrainCircuit className="size-3.5" />
              {summary.traceId}
            </div>
            <h3 className="mt-2 truncate text-base font-semibold">Run {summary.agentRunId}</h3>
          </div>
          <SignatureStatePill tone="live">Evidence ready</SignatureStatePill>
        </div>
      </div>

      <div className="p-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <SummaryMetric
            icon={<Activity className="size-3.5" />}
            label="Confidence"
            tone="live"
            value={`${Math.round(summary.confidence * 100)}%`}
          />
          <SummaryMetric
            icon={<ShieldCheck className="size-3.5" />}
            label="Permission"
            tone="humanLoop"
            value={summary.permissionResult}
          />
          <SummaryMetric
            icon={<LockKeyhole className="size-3.5" />}
            label="Policy"
            tone="structural"
            value={summary.policyResult}
          />
          <SummaryMetric
            icon={<ExternalLink className="size-3.5" />}
            label="Audit"
            tone="structural"
            value={summary.auditLink}
          />
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Database className="size-4 text-[hsl(var(--bukeer-structural))]" />
            Data used
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.dataUsed.map((item) => (
              <span
                key={item}
                className="rounded-md border border-[hsl(var(--bukeer-structural)/0.24)] bg-[hsl(var(--bukeer-structural)/0.08)] px-2 py-1 text-xs font-medium text-[hsl(var(--bukeer-structural))]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TraceGovernance({ summary }: { summary: TraceDrawerSummary }) {
  return (
    <section className="rounded-lg border border-[hsl(var(--bukeer-human-loop)/0.34)] bg-[hsl(var(--bukeer-human-loop)/0.09)] p-4">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 size-4 shrink-0 text-[hsl(var(--bukeer-human-loop))]" />
        <div className="min-w-0">
          <div className="font-semibold">Human approval boundary</div>
          <p className="mt-1 text-sm text-muted-foreground">
            This drawer explains what the agent used and why the workflow remains gated.
            Customer-facing sends require explicit approval.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SignatureStatePill tone="humanLoop">{summary.permissionResult}</SignatureStatePill>
            <SignatureStatePill tone="structural">{summary.policyResult}</SignatureStatePill>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: SignatureTone;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div
        className={cx(
          'flex items-center gap-1.5 text-xs font-medium',
          tone === 'live' && 'text-[hsl(var(--bukeer-live))]',
          tone === 'humanLoop' && 'text-[hsl(var(--bukeer-human-loop))]',
          tone === 'structural' && 'text-[hsl(var(--bukeer-structural))]'
        )}
      >
        {icon}
        {label}
      </div>
      <div className="mt-1 break-words text-xs font-semibold">{value}</div>
    </div>
  );
}

function traceToneForEvent(status: TraceEvent['status']): SignatureTone {
  const actionState: AgenticActionState =
    status === 'completed'
      ? 'executed'
      : status === 'pending'
        ? 'approval_required'
        : status === 'blocked'
          ? 'blocked_policy'
          : status === 'warning'
            ? 'expired'
            : 'rejected';

  return signatureToneForStatus(actionState);
}

function dotClass(tone: SignatureTone) {
  if (tone === 'live') return 'bg-[hsl(var(--bukeer-live))]';
  if (tone === 'humanLoop') return 'bg-[hsl(var(--bukeer-human-loop))]';
  if (tone === 'success') return 'bg-[hsl(var(--bukeer-success))]';
  if (tone === 'warning') return 'bg-[hsl(var(--bukeer-warning))]';
  if (tone === 'danger') return 'bg-destructive';
  return 'bg-[hsl(var(--bukeer-structural))]';
}
