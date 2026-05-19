"use client";

import type {
  AgentSuggestion,
  AgenticActionState,
  ApprovalRequest,
  AuthenticatedAdminSessionContext,
  HumanAgentUiState,
  ItinerarySegment,
  LiveFeedItem,
  PlannerOpportunity,
  TraceEvent,
} from '@bukeer/admin-contract';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileX2,
  Lock,
  MessageSquareText,
  Plane,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type SignatureTone =
  | 'structural'
  | 'live'
  | 'humanLoop'
  | 'success'
  | 'warning'
  | 'danger';

export const signatureStatusLabels: Record<AgenticActionState, string> = {
  observed: 'Observed',
  suggested: 'AI suggestion',
  drafted: 'Drafted',
  blocked_missing_data: 'AI blocked',
  blocked_policy: 'Policy blocked',
  approval_required: 'Approval required',
  approved: 'Approved',
  executing: 'Executing',
  executed: 'Executed',
  rejected: 'Rejected',
  expired: 'Expiring',
};

export type SignatureUiVariantState = Extract<
  HumanAgentUiState,
  | 'loading'
  | 'empty'
  | 'error'
  | 'no_permission'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'executed'
>;

export type SignatureUiVariant = {
  state: SignatureUiVariantState;
  title: string;
  description: string;
  badge: string;
  tone: SignatureTone;
  actionLabel?: string;
};

export const signatureUiVariantDefaults: Record<SignatureUiVariantState, SignatureUiVariant> = {
  loading: {
    state: 'loading',
    title: 'Loading signature workspace',
    description: 'Fetching fixture context and preparing the human-agent controls.',
    badge: 'Loading',
    tone: 'live',
  },
  empty: {
    state: 'empty',
    title: 'No signature work queued',
    description: 'There are no planner opportunities ready for signature review.',
    badge: 'Empty',
    tone: 'structural',
  },
  error: {
    state: 'error',
    title: 'Signature state unavailable',
    description: 'The local prototype state could not be resolved.',
    badge: 'Error',
    tone: 'danger',
    actionLabel: 'Retry',
  },
  no_permission: {
    state: 'no_permission',
    title: 'Permission required',
    description: 'This user cannot approve or execute this signature workflow.',
    badge: 'No permission',
    tone: 'danger',
  },
  approved: {
    state: 'approved',
    title: 'Approved for execution',
    description: 'The human approval gate has been cleared.',
    badge: 'Approved',
    tone: 'success',
  },
  rejected: {
    state: 'rejected',
    title: 'Rejected by reviewer',
    description: 'The proposal remains blocked and requires revision before execution.',
    badge: 'Rejected',
    tone: 'danger',
  },
  executing: {
    state: 'executing',
    title: 'Executing approved action',
    description: 'The local prototype is showing execution-in-progress state only.',
    badge: 'Executing',
    tone: 'live',
  },
  executed: {
    state: 'executed',
    title: 'Execution complete',
    description: 'The approved workflow has completed in prototype state.',
    badge: 'Executed',
    tone: 'success',
  },
};

const toneClasses: Record<SignatureTone, string> = {
  structural:
    'border-[hsl(var(--bukeer-structural)/0.28)] bg-[hsl(var(--bukeer-structural)/0.09)] text-[hsl(var(--bukeer-structural))]',
  live: 'border-[hsl(var(--bukeer-live)/0.32)] bg-[hsl(var(--bukeer-live)/0.10)] text-[hsl(var(--bukeer-live))]',
  humanLoop:
    'border-[hsl(var(--bukeer-human-loop)/0.38)] bg-[hsl(var(--bukeer-human-loop)/0.11)] text-[hsl(var(--bukeer-human-loop))]',
  success:
    'border-[hsl(var(--bukeer-success)/0.34)] bg-[hsl(var(--bukeer-success)/0.10)] text-[hsl(var(--bukeer-success))]',
  warning:
    'border-[hsl(var(--bukeer-warning)/0.48)] bg-[hsl(var(--bukeer-warning)/0.14)] text-amber-700',
  danger: 'border-destructive/35 bg-destructive/10 text-destructive',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function signatureToneForStatus(status: AgenticActionState): SignatureTone {
  if (status === 'executed' || status === 'approved') return 'success';
  if (status === 'suggested' || status === 'drafted' || status === 'executing') return 'live';
  if (status === 'approval_required') return 'humanLoop';
  if (
    status === 'blocked_missing_data' ||
    status === 'blocked_policy' ||
    status === 'rejected'
  ) {
    return 'danger';
  }
  if (status === 'expired') return 'warning';
  return 'structural';
}

export function signatureToneForUiState(state: SignatureUiVariantState): SignatureTone {
  return signatureUiVariantDefaults[state].tone;
}

function dotClass(tone: SignatureTone) {
  if (tone === 'live') return 'bg-[hsl(var(--bukeer-live))]';
  if (tone === 'humanLoop') return 'bg-[hsl(var(--bukeer-human-loop))]';
  if (tone === 'success') return 'bg-[hsl(var(--bukeer-success))]';
  if (tone === 'warning') return 'bg-[hsl(var(--bukeer-warning))]';
  if (tone === 'danger') return 'bg-destructive';
  return 'bg-[hsl(var(--bukeer-structural))]';
}

export function SignatureStatePill({
  tone,
  children,
}: {
  tone: SignatureTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        'inline-flex h-6 max-w-full items-center gap-1 rounded-full border px-2 text-xs font-medium',
        toneClasses[tone]
      )}
    >
      {tone === 'live' ? <Sparkles className="size-3" /> : null}
      {tone === 'humanLoop' ? <Clock3 className="size-3" /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

function SignatureUiVariantIcon({ state }: { state: SignatureUiVariantState }) {
  const className = 'size-4';

  if (state === 'loading' || state === 'executing') {
    return <RefreshCw className={cx(className, 'animate-spin')} />;
  }
  if (state === 'empty') return <FileX2 className={className} />;
  if (state === 'error' || state === 'rejected') return <XCircle className={className} />;
  if (state === 'no_permission') return <Lock className={className} />;
  return <CheckCircle2 className={className} />;
}

export function SignatureUiStatePanel({
  variant,
  onAction,
}: {
  variant: SignatureUiVariant;
  onAction?: () => void;
}) {
  return (
    <section
      data-signature-ui-state={variant.state}
      className={cx(
        'rounded-lg border bg-card p-4 shadow-sm',
        variant.tone === 'live' && 'border-[hsl(var(--bukeer-live)/0.34)]',
        variant.tone === 'humanLoop' && 'border-[hsl(var(--bukeer-human-loop)/0.38)]',
        variant.tone === 'success' && 'border-[hsl(var(--bukeer-success)/0.34)]',
        variant.tone === 'warning' && 'border-[hsl(var(--bukeer-warning)/0.48)]',
        variant.tone === 'danger' && 'border-destructive/35',
        variant.tone === 'structural' && 'border-border'
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span
            className={cx(
              'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md border',
              toneClasses[variant.tone]
            )}
          >
            <SignatureUiVariantIcon state={variant.state} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">{variant.title}</h2>
              <SignatureStatePill tone={variant.tone}>{variant.badge}</SignatureStatePill>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{variant.description}</p>
          </div>
        </div>
        {variant.actionLabel ? (
          <button
            type="button"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted"
            onClick={onAction}
          >
            {variant.actionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function SignatureMetric({
  label,
  value,
  tone,
  compact = false,
}: {
  label: string;
  value: string;
  tone: SignatureTone;
  compact?: boolean;
}) {
  return (
    <div className={cx('rounded-md border border-border bg-card', compact ? 'p-2' : 'px-3 py-2')}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cx(
          'mt-1 truncate font-semibold',
          tone === 'live' && 'text-[hsl(var(--bukeer-live))]',
          tone === 'humanLoop' && 'text-[hsl(var(--bukeer-human-loop))]',
          tone === 'warning' && 'text-amber-700'
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function SignaturePlannerHeader({
  opportunity,
  actions,
}: {
  opportunity: PlannerOpportunity;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-4 backdrop-blur md:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SignatureStatePill tone="structural">Human-Agent OS</SignatureStatePill>
            <SignatureStatePill tone="humanLoop">Not ready to send</SignatureStatePill>
            <SignatureStatePill tone="live">Trace available</SignatureStatePill>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal md:text-3xl">
            Planner Workbench
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {opportunity.leadName} - {opportunity.destination} - {opportunity.tripDates} -{' '}
            {opportunity.valueLabel}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          {actions ? <div>{actions}</div> : null}
          <div className="grid grid-cols-3 gap-2 text-sm sm:w-[420px]">
            <SignatureMetric label="Quoted" value={opportunity.valueLabel} tone="live" />
            <SignatureMetric label="Margin" value={opportunity.marginLabel} tone="humanLoop" />
            <SignatureMetric label="SLA" value={opportunity.slaLabel} tone="warning" />
          </div>
        </div>
      </div>
    </header>
  );
}

export function SignatureTripRail({
  opportunities,
  session,
  traceIdForOpportunity,
  onInspectTrace,
}: {
  opportunities: PlannerOpportunity[];
  session: AuthenticatedAdminSessionContext;
  traceIdForOpportunity: (opportunity: PlannerOpportunity, index: number) => string;
  onInspectTrace: (traceId: string) => void;
}) {
  return (
    <aside className="w-full shrink-0 border-b border-border bg-[hsl(var(--bukeer-surface-rail))] lg:w-72 lg:border-b-0 lg:border-r">
      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Planner queue
            </div>
            <div className="mt-1 text-base font-semibold">Bukeer travel desk</div>
          </div>
          <Plane className="size-5 text-[hsl(var(--bukeer-structural))]" />
        </div>
        <div className="mt-4 flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground">
          <Search className="size-4" />
          Search trips...
        </div>
        <div className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          {session.displayName} - {session.role}
        </div>
      </div>

      <div className="divide-y divide-border">
        {opportunities.map((opportunity, index) => {
          const tone = signatureToneForStatus(opportunity.actionState);
          return (
            <button
              key={opportunity.id}
              type="button"
              className={cx(
                'flex w-full items-start gap-3 p-4 text-left transition hover:bg-background',
                index === 0 && 'bg-background/80'
              )}
              onClick={() => onInspectTrace(traceIdForOpportunity(opportunity, index))}
            >
              <span className={cx('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', dotClass(tone))} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{opportunity.leadName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {opportunity.destination}
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{opportunity.slaLabel}</span>
                  <span>{opportunity.missingDataCount} missing</span>
                </span>
              </span>
              <span className="text-sm font-semibold">{opportunity.valueLabel}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export function SignatureBlockedBanner({
  reason,
  missingCount,
}: {
  reason: string;
  missingCount: number;
}) {
  return (
    <section className="rounded-lg border border-[hsl(var(--bukeer-human-loop)/0.40)] bg-[hsl(var(--bukeer-human-loop)/0.10)] px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-[hsl(var(--bukeer-human-loop))]" />
          <div>
            <div className="font-semibold">Public proposal send is blocked</div>
            <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
          </div>
        </div>
        <SignatureStatePill tone="humanLoop">{missingCount} fields missing</SignatureStatePill>
      </div>
    </section>
  );
}

export function SignatureItineraryManifest({
  segments,
  traceId,
  onInspectTrace,
}: {
  segments: ItinerarySegment[];
  traceId: string;
  onInspectTrace: (traceId: string) => void;
}) {
  return (
    <section aria-labelledby="manifest-heading" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Client itinerary state
          </div>
          <h2 id="manifest-heading" className="mt-1 text-xl font-semibold">
            Itinerary Manifest
          </h2>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[hsl(var(--bukeer-live)/0.34)] bg-[hsl(var(--bukeer-live)/0.10)] px-3 text-sm font-medium text-[hsl(var(--bukeer-live))] transition hover:bg-[hsl(var(--bukeer-live)/0.16)]"
          onClick={() => onInspectTrace(traceId)}
        >
          <ShieldCheck className="size-4" />
          Inspect trace
        </button>
      </div>

      <div className="space-y-3">
        {segments.map((segment) => (
          <SignatureItineraryManifestRow
            key={segment.id}
            segment={segment}
            onInspectTrace={onInspectTrace}
          />
        ))}
      </div>
    </section>
  );
}

export function SignatureItineraryManifestRow({
  segment,
  onInspectTrace,
}: {
  segment: ItinerarySegment;
  onInspectTrace: (traceId: string) => void;
}) {
  const tone = signatureToneForStatus(segment.status);

  return (
    <article
      className={cx(
        'rounded-lg border border-border bg-card p-4 shadow-sm',
        tone === 'live' && 'border-l-4 border-l-[hsl(var(--bukeer-live))]',
        tone === 'humanLoop' && 'border-l-4 border-l-[hsl(var(--bukeer-human-loop))]',
        tone === 'danger' && 'border-l-4 border-l-destructive',
        tone === 'success' && 'border-l-4 border-l-[hsl(var(--bukeer-success))]',
        tone === 'warning' && 'border-l-4 border-l-[hsl(var(--bukeer-warning))]'
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <Plane className="size-3.5" />
            {segment.dayLabel}
            <SignatureStatePill tone={tone}>
              {signatureStatusLabels[segment.status]}
            </SignatureStatePill>
          </div>
          <h3 className="mt-2 text-base font-semibold">{segment.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{segment.supplier}</p>
        </div>
        <div className="flex shrink-0 items-end justify-between gap-4 md:flex-col md:items-end">
          <div className="text-right">
            <div className="font-semibold">{segment.priceLabel}</div>
            <div className="text-xs text-[hsl(var(--bukeer-live))]">
              {segment.marginLabel} margin
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-md border border-border px-2.5 text-xs font-medium transition hover:bg-muted"
            onClick={() => onInspectTrace(segment.traceId)}
          >
            Inspect trace
          </button>
        </div>
      </div>
    </article>
  );
}

export function SignatureCopilotPanel({
  suggestions,
  onInspectTrace,
}: {
  suggestions: AgentSuggestion[];
  onInspectTrace: (traceId: string) => void;
}) {
  return (
    <section className="rounded-lg border border-[hsl(var(--bukeer-live)/0.30)] bg-[hsl(var(--bukeer-live)/0.07)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold text-[hsl(var(--bukeer-live))]">
          <Sparkles className="size-4" />
          Conversation Copilot
        </div>
        <SignatureStatePill tone="live">AI suggestion</SignatureStatePill>
      </div>
      <div className="mt-4 space-y-3">
        {suggestions.map((suggestion) => (
          <article key={suggestion.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-semibold">{suggestion.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{suggestion.proposedAction}</p>
                <p className="mt-2 text-xs text-muted-foreground">{suggestion.rationale}</p>
              </div>
              <SignatureStatePill tone={signatureToneForStatus(suggestion.state)}>
                {Math.round(suggestion.confidence * 100)}%
              </SignatureStatePill>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 items-center justify-center rounded-md border border-border px-2.5 text-xs font-medium transition hover:bg-muted"
                onClick={() => onInspectTrace(suggestion.traceId)}
              >
                Inspect trace
              </button>
              <span className="text-xs text-muted-foreground">{suggestion.autonomyLevel}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SignatureTracePreview({
  traceEvents,
  traceId,
  onInspectTrace,
}: {
  traceEvents: TraceEvent[];
  traceId: string;
  onInspectTrace: (traceId: string) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Governance
          </div>
          <h2 className="mt-1 font-semibold">Trace & approval chain</h2>
        </div>
        <SignatureStatePill tone="humanLoop">Human loop</SignatureStatePill>
      </div>
      <div className="mt-4 space-y-3">
        {traceEvents.slice(0, 4).map((event) => {
          const tone =
            event.status === 'completed'
              ? 'success'
              : event.status === 'blocked'
                ? 'danger'
                : 'humanLoop';
          return (
            <div key={event.id} className="relative pl-7">
              <span
                className={cx(
                  'absolute left-0 top-1.5 size-3 rounded-full ring-4',
                  dotClass(tone),
                  'ring-muted'
                )}
              />
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{event.title}</div>
                  <SignatureStatePill tone={tone}>{event.status}</SignatureStatePill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{event.summary}</p>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted"
        onClick={() => onInspectTrace(traceId)}
      >
        Inspect trace
      </button>
    </section>
  );
}

export function SignatureLiveFeedColumn({
  items,
  onInspectTrace,
}: {
  items: LiveFeedItem[];
  onInspectTrace: (traceId: string) => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Live feed
          </div>
          <h2 className="mt-1 font-semibold">Supplier intelligence</h2>
        </div>
        <SignatureStatePill tone="live">Live</SignatureStatePill>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{item.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <SignatureStatePill tone={signatureToneForStatus(item.status)}>
                {signatureStatusLabels[item.status]}
              </SignatureStatePill>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{item.updatedLabel}</span>
              <button
                type="button"
                className="text-xs font-semibold text-[hsl(var(--bukeer-structural))] hover:underline"
                onClick={() => onInspectTrace(item.traceId)}
              >
                Inspect trace
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SignatureMarginGuard({
  margin,
  target,
  revenue,
  cost,
  profit,
}: {
  margin: string;
  target: string;
  revenue: string;
  cost: string;
  profit: string;
}) {
  return (
    <section className="rounded-lg border border-[hsl(var(--bukeer-warning)/0.48)] bg-[hsl(var(--bukeer-warning)/0.12)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="size-4 text-[hsl(var(--bukeer-human-loop))]" />
          Margin guard
        </div>
        <div className="font-semibold text-[hsl(var(--bukeer-human-loop))]">{margin}</div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-background">
        <div className="h-2 w-3/4 rounded-full bg-[hsl(var(--bukeer-warning))]" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <SignatureMetric label="Revenue" value={revenue} tone="structural" compact />
        <SignatureMetric label="Cost" value={cost} tone="structural" compact />
        <SignatureMetric label="Profit" value={profit} tone="live" compact />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Target margin: {target}. Manager approval is required before any customer-facing send.
      </p>
    </section>
  );
}

export function SignatureMissingDataChecklist({ items }: { items: string[] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 font-semibold text-[hsl(var(--bukeer-human-loop))]">
        <CircleDot className="size-4" />
        Missing data
      </div>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm">
            <Lock className="mt-0.5 size-4 text-[hsl(var(--bukeer-human-loop))]" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SignatureSafetyBoundary({ simulationMessage }: { simulationMessage: string | null }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 text-sm">
      <div className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="size-4 text-[hsl(var(--bukeer-live))]" />
        Fixture data only
      </div>
      <p className="mt-2 text-muted-foreground">
        Approval controls update this prototype locally. They do not call Supabase, tools, or
        public-send workflows.
      </p>
      {simulationMessage ? (
        <div className="mt-3 rounded-md border border-[hsl(var(--bukeer-live)/0.34)] bg-[hsl(var(--bukeer-live)/0.08)] p-3 text-xs">
          {simulationMessage}
        </div>
      ) : null}
    </section>
  );
}

export function SignatureApprovalCommandBar({
  approval,
  onInspectTrace,
  onSimulate,
}: {
  approval: ApprovalRequest;
  onInspectTrace: (traceId: string) => void;
  onSimulate: (message: string) => void;
}) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <UserCheck className="mt-0.5 size-4 shrink-0 text-[hsl(var(--bukeer-human-loop))]" />
          <div className="min-w-0 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Approval required</span>
              <span className="text-muted-foreground">{approval.proposedAction}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>Risk: {approval.riskFlags.join(', ')}</span>
              <span>Permission: {approval.requiredPermission}</span>
              <span>{approval.slaLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted"
            onClick={() => onInspectTrace(approval.traceId)}
          >
            <MessageSquareText className="size-4" />
            Inspect trace
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 px-3 text-sm font-medium text-destructive transition hover:bg-destructive/15"
            onClick={() => onSimulate('Rejected locally. No production write was executed.')}
          >
            Reject
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[hsl(var(--bukeer-live))] px-3 text-sm font-semibold text-white transition hover:opacity-90"
            onClick={() => onSimulate('Approved locally for prototype review. Execution remains blocked.')}
          >
            <CheckCircle2 className="size-4" />
            Approve once
          </button>
        </div>
      </div>
    </footer>
  );
}
