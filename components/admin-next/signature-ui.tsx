"use client";

import type {
  AdminDataSourceMode,
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
  ClipboardCheck,
  Clock3,
  FilePenLine,
  FileX2,
  Lock,
  MessageSquareText,
  Pencil,
  Plane,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';

export type SignatureTone =
  | 'structural'
  | 'live'
  | 'humanLoop'
  | 'success'
  | 'warning'
  | 'danger';

export const signatureStatusLabels: Record<AgenticActionState, string> = {
  observed: adminNextCopy.signature.statusLabels.observed,
  suggested: adminNextCopy.signature.statusLabels.suggested,
  drafted: adminNextCopy.signature.statusLabels.drafted,
  blocked_missing_data: adminNextCopy.signature.statusLabels.blocked_missing_data,
  blocked_policy: adminNextCopy.signature.statusLabels.blocked_policy,
  approval_required: adminNextCopy.signature.statusLabels.approval_required,
  approved: adminNextCopy.signature.statusLabels.approved,
  executing: adminNextCopy.signature.statusLabels.executing,
  executed: adminNextCopy.signature.statusLabels.executed,
  rejected: adminNextCopy.signature.statusLabels.rejected,
  expired: adminNextCopy.signature.statusLabels.expired,
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

export type BukeerDraftEditableField =
  | string
  | {
      id?: string;
      label: string;
      value?: string;
      currentValue?: string;
      proposedValue?: string;
      required?: boolean;
      status?: string;
    };

export type BukeerDraftAction = {
  id: string;
  type?: string;
  draftType?: string;
  kind?: string;
  draftKind?: string;
  title?: string;
  status?: string;
  state?: string;
  editableFields?: BukeerDraftEditableField[];
  fields?: BukeerDraftEditableField[];
  requiredHumanAction?: string;
  humanAction?: string;
  traceId: string;
  body?: string;
  proposedDraft?: string;
  description?: string;
  rationale?: string;
  riskFlags?: string[];
  missingData?: string[];
  requiresHumanReview?: boolean;
  noProductionWrite?: boolean;
};

export type SignatureWhatsAppHandoffResult = {
  referenceCode: string;
  waMeUrl: string;
  expiresAt: string | null;
};

export type SignatureWhatsAppHandoffHandler = (
  action: BukeerDraftAction
) => Promise<SignatureWhatsAppHandoffResult>;

type SignatureWhatsAppHandoffLocalState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: SignatureWhatsAppHandoffResult }
  | { status: 'error'; message: string };

export const signatureUiVariantDefaults: Record<SignatureUiVariantState, SignatureUiVariant> = {
  loading: {
    state: 'loading',
    title: adminNextCopy.signature.variantDefaults.loading.title,
    description: adminNextCopy.signature.variantDefaults.loading.description,
    badge: adminNextCopy.signature.variantDefaults.loading.badge,
    tone: 'live',
  },
  empty: {
    state: 'empty',
    title: adminNextCopy.signature.variantDefaults.empty.title,
    description: adminNextCopy.signature.variantDefaults.empty.description,
    badge: adminNextCopy.signature.variantDefaults.empty.badge,
    tone: 'structural',
  },
  error: {
    state: 'error',
    title: adminNextCopy.signature.variantDefaults.error.title,
    description: adminNextCopy.signature.variantDefaults.error.description,
    badge: adminNextCopy.signature.variantDefaults.error.badge,
    tone: 'danger',
    actionLabel: adminNextCopy.signature.variantDefaults.error.actionLabel,
  },
  no_permission: {
    state: 'no_permission',
    title: adminNextCopy.signature.variantDefaults.noPermission.title,
    description: adminNextCopy.signature.variantDefaults.noPermission.description,
    badge: adminNextCopy.signature.variantDefaults.noPermission.badge,
    tone: 'danger',
  },
  approved: {
    state: 'approved',
    title: adminNextCopy.signature.variantDefaults.approved.title,
    description: adminNextCopy.signature.variantDefaults.approved.description,
    badge: adminNextCopy.signature.variantDefaults.approved.badge,
    tone: 'success',
  },
  rejected: {
    state: 'rejected',
    title: adminNextCopy.signature.variantDefaults.rejected.title,
    description: adminNextCopy.signature.variantDefaults.rejected.description,
    badge: adminNextCopy.signature.variantDefaults.rejected.badge,
    tone: 'danger',
  },
  executing: {
    state: 'executing',
    title: adminNextCopy.signature.variantDefaults.executing.title,
    description: adminNextCopy.signature.variantDefaults.executing.description,
    badge: adminNextCopy.signature.variantDefaults.executing.badge,
    tone: 'live',
  },
  executed: {
    state: 'executed',
    title: adminNextCopy.signature.variantDefaults.executed.title,
    description: adminNextCopy.signature.variantDefaults.executed.description,
    badge: adminNextCopy.signature.variantDefaults.executed.badge,
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

function isAgenticActionState(status: string): status is AgenticActionState {
  return status in signatureStatusLabels;
}

export function signatureToneForDraftActionStatus(status?: string): SignatureTone {
  const normalizedStatus = status?.trim().toLowerCase();

  if (!normalizedStatus) return 'live';
  if (isAgenticActionState(normalizedStatus)) return signatureToneForStatus(normalizedStatus);
  if (normalizedStatus.includes('blocked') || normalizedStatus.includes('rejected')) {
    return 'danger';
  }
  if (
    normalizedStatus.includes('approval') ||
    normalizedStatus.includes('review') ||
    normalizedStatus.includes('required')
  ) {
    return 'humanLoop';
  }
  if (normalizedStatus.includes('approved') || normalizedStatus.includes('complete')) {
    return 'success';
  }
  if (normalizedStatus.includes('draft') || normalizedStatus.includes('edit')) return 'live';
  return 'structural';
}

function draftActionStatusLabel(status?: string) {
  if (!status) return adminNextCopy.signature.draft.fallbackStatus;
  if (isAgenticActionState(status)) return signatureStatusLabels[status];
  return status
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function draftActionTypeLabel(action: BukeerDraftAction) {
  const draftType =
    action.draftType ?? action.type ?? action.kind ?? action.draftKind ?? adminNextCopy.signature.draft.fallbackType;
  return draftType
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function draftActionFields(action: BukeerDraftAction) {
  const fields = action.editableFields ?? action.fields ?? [];
  if (fields.length > 0) return fields;
  if (action.body || action.proposedDraft) {
    return [
      {
        id: `${action.id}-body`,
        label: adminNextCopy.signature.draft.bodyLabel,
        proposedValue: action.proposedDraft ?? action.body,
        required: true,
      },
    ];
  }
  return [];
}

function draftActionFieldLabel(field: BukeerDraftEditableField) {
  if (typeof field !== 'string') return field.label;
  return field
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function draftActionFieldValue(action: BukeerDraftAction, field: BukeerDraftEditableField) {
  if (typeof field === 'string') {
    if (field === 'body') return action.body ?? action.proposedDraft ?? adminNextCopy.signature.draft.needsReview;
    if (field === 'title') return action.title ?? adminNextCopy.signature.draft.needsReview;
    return adminNextCopy.signature.draft.localReviewValue;
  }
  return field.proposedValue ?? field.value ?? field.currentValue ?? adminNextCopy.signature.draft.needsReview;
}

function draftActionFieldId(field: BukeerDraftEditableField, index: number) {
  if (typeof field === 'string') return `${field}-${index}`;
  return field.id ?? `${field.label}-${index}`;
}

function draftActionFieldRequired(field: BukeerDraftEditableField) {
  return typeof field === 'string' ? true : field.required;
}

function draftActionFieldStatus(field: BukeerDraftEditableField) {
  return typeof field === 'string' ? undefined : field.status;
}

function isManualWhatsAppHandoffAction(action: BukeerDraftAction) {
  const kind = action.kind ?? action.draftKind ?? action.type ?? action.draftType;
  return kind === 'manual_whatsapp_handoff';
}

function handoffErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return adminNextCopy.signature.draft.handoffErrorFallback;
}

function displayWaMeUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

export function SignatureWhatsAppHandoffStatus({
  state,
}: {
  state: Exclude<SignatureWhatsAppHandoffLocalState, { status: 'idle' }>;
}) {
  if (state.status === 'loading') {
    return (
      <div
        className="mt-3 rounded-md border border-[hsl(var(--bukeer-live)/0.32)] bg-[hsl(var(--bukeer-live)/0.09)] p-3 text-xs text-muted-foreground"
        data-testid="whatsapp-handoff-loading"
      >
        <div className="flex items-center gap-2 font-medium text-[hsl(var(--bukeer-live))]">
          <RefreshCw className="size-3.5 animate-spin" />
          {adminNextCopy.signature.whatsappHandoff.creatingTitle}
        </div>
        <p className="mt-1">{adminNextCopy.signature.whatsappHandoff.manualSendDescription}</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div
        className="mt-3 rounded-md border border-destructive/35 bg-destructive/10 p-3 text-xs text-destructive"
        data-testid="whatsapp-handoff-error"
      >
        <div className="flex items-center gap-2 font-medium">
          <XCircle className="size-3.5" />
          {adminNextCopy.signature.whatsappHandoff.errorTitle}
        </div>
        <p className="mt-1">{state.message}</p>
        <p className="mt-1 text-muted-foreground">
          {adminNextCopy.signature.whatsappHandoff.immutableBoundary}
        </p>
      </div>
    );
  }

  return (
    <div
      className="mt-3 rounded-md border border-[hsl(var(--bukeer-success)/0.34)] bg-[hsl(var(--bukeer-success)/0.10)] p-3 text-xs"
      data-testid="whatsapp-handoff-success"
    >
      <div className="flex flex-wrap items-center gap-2">
        <CheckCircle2 className="size-4 text-[hsl(var(--bukeer-success))]" />
        <span className="font-semibold text-[hsl(var(--bukeer-success))]">
          {adminNextCopy.signature.whatsappHandoff.successTitle}
        </span>
        <SignatureStatePill tone="humanLoop">{adminNextCopy.signature.whatsappHandoff.notSentPill}</SignatureStatePill>
      </div>
      <p className="mt-2 text-muted-foreground">
        {adminNextCopy.signature.whatsappHandoff.successDescription}
      </p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded border border-border bg-background px-2 py-1.5">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {adminNextCopy.signature.whatsappHandoff.referenceLabel}
          </dt>
          <dd className="mt-0.5 break-words font-medium text-foreground">
            {state.result.referenceCode}
          </dd>
        </div>
        <div className="rounded border border-border bg-background px-2 py-1.5">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {adminNextCopy.signature.whatsappHandoff.waMeLabel}
          </dt>
          <dd className="mt-0.5 break-words font-medium text-foreground">
            <a
              className="underline-offset-2 hover:underline"
              data-testid="whatsapp-handoff-open"
              href={state.result.waMeUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {displayWaMeUrl(state.result.waMeUrl)}
            </a>
          </dd>
        </div>
        <div className="rounded border border-border bg-background px-2 py-1.5">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {adminNextCopy.signature.whatsappHandoff.expiresAtLabel}
          </dt>
          <dd className="mt-0.5 break-words font-medium text-foreground">
            {state.result.expiresAt ? (
              <time dateTime={state.result.expiresAt}>{state.result.expiresAt}</time>
            ) : (
              adminNextCopy.signature.whatsappHandoff.noExpiryFallback
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
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

export function SignatureDraftActionCard({
  action,
  onInspectTrace,
  onSimulate,
  onCreateWhatsAppHandoff,
}: {
  action: BukeerDraftAction;
  onInspectTrace: (traceId: string) => void;
  onSimulate?: (message: string) => void;
  onCreateWhatsAppHandoff?: SignatureWhatsAppHandoffHandler;
}) {
  const [whatsAppHandoffState, setWhatsAppHandoffState] =
    useState<SignatureWhatsAppHandoffLocalState>({ status: 'idle' });
  const status = action.status ?? action.state ?? 'drafted';
  const tone = signatureToneForDraftActionStatus(status);
  const fields = draftActionFields(action);
  const requiredHumanAction =
    action.requiredHumanAction ??
    action.humanAction ??
    (action.requiresHumanReview
      ? adminNextCopy.signature.draft.humanReviewRequired
      : adminNextCopy.signature.draft.reviewDraftFields);
  const canCreateWhatsAppHandoff = Boolean(onCreateWhatsAppHandoff);
  const handoffButtonDisabled =
    whatsAppHandoffState.status === 'loading' || whatsAppHandoffState.status === 'success';

  async function createWhatsAppHandoff() {
    if (!onCreateWhatsAppHandoff) return;

    setWhatsAppHandoffState({ status: 'loading' });
    try {
      const result = await onCreateWhatsAppHandoff(action);
      setWhatsAppHandoffState({ status: 'success', result });
      onSimulate?.(adminNextCopy.signature.draft.handoffCreatedAction);
    } catch (error) {
      setWhatsAppHandoffState({ status: 'error', message: handoffErrorMessage(error) });
    }
  }

  return (
    <article
      className={cx(
        'rounded-lg border bg-card p-4 shadow-sm',
        tone === 'live' && 'border-[hsl(var(--bukeer-live)/0.34)]',
        tone === 'humanLoop' && 'border-[hsl(var(--bukeer-human-loop)/0.42)]',
        tone === 'danger' && 'border-destructive/35',
        tone === 'success' && 'border-[hsl(var(--bukeer-success)/0.34)]',
        tone === 'warning' && 'border-[hsl(var(--bukeer-warning)/0.48)]',
        tone === 'structural' && 'border-border'
      )}
      data-draft-action-id={action.id}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <FilePenLine className="size-3.5" />
            {draftActionTypeLabel(action)}
            <SignatureStatePill tone={tone}>{draftActionStatusLabel(status)}</SignatureStatePill>
          </div>
          <h3 className="mt-2 text-base font-semibold">
            {action.title ?? adminNextCopy.signature.draft.awaitingReviewTitle}
          </h3>
          {action.description ?? action.rationale ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {action.description ?? action.rationale}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md border border-border px-2.5 text-xs font-medium transition hover:bg-muted"
          data-testid={`draft-action-trace-${action.id}`}
          onClick={() => onInspectTrace(action.traceId)}
        >
          <ShieldCheck className="size-3.5" />
          {adminNextCopy.signature.draft.inspectTraceAction}
        </button>
      </div>

      <section className="mt-4 rounded-md border border-[hsl(var(--bukeer-human-loop)/0.34)] bg-[hsl(var(--bukeer-human-loop)/0.09)] p-3">
        <div className="flex items-start gap-2">
          <UserCheck className="mt-0.5 size-4 shrink-0 text-[hsl(var(--bukeer-human-loop))]" />
          <div>
            <div className="text-sm font-semibold">{adminNextCopy.signature.draft.requiredHumanActionTitle}</div>
            <p className="mt-1 text-xs text-muted-foreground">{requiredHumanAction}</p>
          </div>
        </div>
      </section>

      <section className="mt-4">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {adminNextCopy.signature.draft.editableFieldsTitle}
        </div>
        <div className="mt-2 grid gap-2">
          {fields.length > 0 ? (
            fields.map((field, index) => (
              <div
                key={draftActionFieldId(field, index)}
                className="rounded-md border border-border bg-background px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{draftActionFieldLabel(field)}</span>
                  {draftActionFieldRequired(field) ? (
                    <SignatureStatePill tone="humanLoop">{adminNextCopy.signature.draft.requiredPill}</SignatureStatePill>
                  ) : null}
                </div>
                <div className="mt-1 break-words text-sm text-muted-foreground">
                  {draftActionFieldValue(action, field)}
                </div>
                {draftActionFieldStatus(field) ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {adminNextCopy.signature.draft.statusLabel(draftActionStatusLabel(draftActionFieldStatus(field)))}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              {adminNextCopy.signature.draft.noEditableFields}
            </div>
          )}
        </div>
      </section>

      <div className="mt-4 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
        {adminNextCopy.signature.draft.safetyBoundary}
      </div>

      {canCreateWhatsAppHandoff ? (
        <section className="mt-4 rounded-md border border-[hsl(var(--bukeer-human-loop)/0.34)] bg-[hsl(var(--bukeer-surface-panel))] p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <MessageSquareText className="size-3.5" />
                {adminNextCopy.signature.draft.whatsappHandoffTitle}
                <SignatureStatePill tone="humanLoop">{adminNextCopy.signature.draft.manualSendOnlyPill}</SignatureStatePill>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {adminNextCopy.signature.draft.manualSendDescription}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md border border-[hsl(var(--bukeer-human-loop)/0.38)] bg-[hsl(var(--bukeer-human-loop)/0.11)] px-2.5 text-xs font-medium text-[hsl(var(--bukeer-human-loop))] transition hover:bg-[hsl(var(--bukeer-human-loop)/0.17)] disabled:cursor-not-allowed disabled:opacity-60"
              data-testid={`draft-action-whatsapp-handoff-${action.id}`}
              disabled={handoffButtonDisabled}
              onClick={createWhatsAppHandoff}
            >
              {whatsAppHandoffState.status === 'loading' ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <MessageSquareText className="size-3.5" />
              )}
              {whatsAppHandoffState.status === 'loading'
                ? adminNextCopy.signature.draft.creatingHandoffAction
                : whatsAppHandoffState.status === 'success'
                  ? adminNextCopy.signature.draft.handoffCreatedAction
                  : adminNextCopy.signature.draft.createHandoffAction}
            </button>
          </div>
          {whatsAppHandoffState.status !== 'idle' ? (
            <SignatureWhatsAppHandoffStatus state={whatsAppHandoffState} />
          ) : null}
        </section>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-[hsl(var(--bukeer-live)/0.34)] bg-[hsl(var(--bukeer-live)/0.10)] px-2.5 text-xs font-medium text-[hsl(var(--bukeer-live))] transition hover:bg-[hsl(var(--bukeer-live)/0.16)]"
          data-testid={`draft-action-review-${action.id}`}
          onClick={() =>
            onSimulate?.(adminNextCopy.signature.draft.reviewedMessage(action.id))
          }
        >
          <ClipboardCheck className="size-3.5" />
          {adminNextCopy.signature.draft.reviewAction}
        </button>
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border px-2.5 text-xs font-medium transition hover:bg-muted"
          data-testid={`draft-action-edit-${action.id}`}
          onClick={() =>
            onSimulate?.(adminNextCopy.signature.draft.editMessage(action.id))
          }
        >
          <Pencil className="size-3.5" />
          {adminNextCopy.signature.draft.editAction}
        </button>
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 text-xs font-medium text-destructive transition hover:bg-destructive/15"
          data-testid={`draft-action-discard-${action.id}`}
          onClick={() =>
            onSimulate?.(adminNextCopy.signature.draft.discardMessage(action.id))
          }
        >
          <Trash2 className="size-3.5" />
          {adminNextCopy.signature.draft.discardAction}
        </button>
      </div>
    </article>
  );
}

export function SignatureDraftActionPanel({
  draftActions,
  onInspectTrace,
  onSimulate,
  whatsappHandoffEnabled = false,
  onCreateWhatsAppHandoff,
}: {
  draftActions: BukeerDraftAction[];
  onInspectTrace: (traceId: string) => void;
  onSimulate?: (message: string) => void;
  whatsappHandoffEnabled?: boolean;
  onCreateWhatsAppHandoff?: SignatureWhatsAppHandoffHandler;
}) {
  if (draftActions.length === 0) return null;

  return (
    <section
      aria-labelledby="draft-actions-heading"
      className="space-y-3"
      data-testid="draft-action-panel"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {adminNextCopy.signature.draft.panelEyebrow}
          </div>
          <h2 id="draft-actions-heading" className="mt-1 text-xl font-semibold">
            {adminNextCopy.signature.draft.panelTitle}
          </h2>
        </div>
        <SignatureStatePill tone="humanLoop">{adminNextCopy.signature.draft.localSimulationPill}</SignatureStatePill>
      </div>
      <div className="space-y-3">
        {draftActions.map((action) => (
          <SignatureDraftActionCard
            key={action.id}
            action={action}
            onInspectTrace={onInspectTrace}
            onSimulate={onSimulate}
            onCreateWhatsAppHandoff={
              whatsappHandoffEnabled && isManualWhatsAppHandoffAction(action)
                ? onCreateWhatsAppHandoff
                : undefined
            }
          />
        ))}
      </div>
    </section>
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
            data-testid={`signature-ui-state-action-${variant.state}`}
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
            <SignatureStatePill tone="structural">{adminNextCopy.signature.header.productPill}</SignatureStatePill>
            <SignatureStatePill tone="humanLoop">{adminNextCopy.signature.header.blockedPill}</SignatureStatePill>
            <SignatureStatePill tone="live">{adminNextCopy.signature.header.tracePill}</SignatureStatePill>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal md:text-3xl">
            {adminNextCopy.signature.header.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {opportunity.leadName} - {opportunity.destination} - {opportunity.tripDates} -{' '}
            {opportunity.valueLabel}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          {actions ? <div>{actions}</div> : null}
          <div className="grid grid-cols-3 gap-2 text-sm sm:w-[420px]">
            <SignatureMetric label={adminNextCopy.signature.header.quotedLabel} value={opportunity.valueLabel} tone="live" />
            <SignatureMetric label={adminNextCopy.signature.header.marginLabel} value={opportunity.marginLabel} tone="humanLoop" />
            <SignatureMetric label={adminNextCopy.signature.header.slaLabel} value={opportunity.slaLabel} tone="warning" />
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
              {adminNextCopy.signature.rail.eyebrow}
            </div>
            <div className="mt-1 text-base font-semibold">{adminNextCopy.signature.rail.title}</div>
          </div>
          <Plane className="size-5 text-[hsl(var(--bukeer-structural))]" />
        </div>
        <div className="mt-4 flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground">
          <Search className="size-4" />
          {adminNextCopy.signature.rail.searchPlaceholder}
        </div>
        <div
          data-testid="signature-session-identity"
          className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground"
        >
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
              data-testid={`signature-trip-rail-opportunity-${opportunity.id}`}
              style={{ color: 'var(--bukeer-on-surface-color)' }}
              className={cx(
                'bukeer-trip-rail-item flex w-full items-start gap-3 p-4 text-left transition hover:bg-[hsl(var(--bukeer-structural)/0.08)]',
                index === 0 && 'bg-[hsl(var(--bukeer-structural)/0.14)]'
              )}
              onClick={() => onInspectTrace(traceIdForOpportunity(opportunity, index))}
            >
              <span className={cx('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', dotClass(tone))} />
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate font-semibold"
                  data-testid={`trip-rail-lead-${index}`}
                  style={{ color: 'var(--bukeer-on-surface-color)' }}
                >
                  {opportunity.leadName}
                </span>
                <span
                  className="bukeer-trip-rail-muted block truncate text-xs"
                  style={{ color: 'var(--bukeer-on-surface-muted-color)' }}
                >
                  {opportunity.destination}
                </span>
                <span
                  className="bukeer-trip-rail-muted mt-2 flex flex-wrap items-center gap-2 text-xs"
                  style={{ color: 'var(--bukeer-on-surface-muted-color)' }}
                >
                  <span>{opportunity.slaLabel}</span>
                  <span>{opportunity.missingDataCount} missing</span>
                </span>
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--bukeer-on-surface-color)' }}
              >
                {opportunity.valueLabel}
              </span>
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
            <div className="font-semibold">{adminNextCopy.signature.blockedBanner.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
          </div>
        </div>
        <SignatureStatePill tone="humanLoop">{adminNextCopy.signature.blockedBanner.missingFieldsPill(missingCount)}</SignatureStatePill>
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
            {adminNextCopy.signature.manifest.eyebrow}
          </div>
          <h2 id="manifest-heading" className="mt-1 text-xl font-semibold">
            {adminNextCopy.signature.manifest.title}
          </h2>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[hsl(var(--bukeer-live)/0.34)] bg-[hsl(var(--bukeer-live)/0.10)] px-3 text-sm font-medium text-[hsl(var(--bukeer-live))] transition hover:bg-[hsl(var(--bukeer-live)/0.16)]"
          data-testid="signature-itinerary-manifest-trace"
          onClick={() => onInspectTrace(traceId)}
        >
          <ShieldCheck className="size-4" />
          {adminNextCopy.signature.manifest.inspectTraceAction}
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
              {adminNextCopy.signature.manifest.marginLabel(segment.marginLabel)}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-md border border-border px-2.5 text-xs font-medium transition hover:bg-muted"
            data-testid={`signature-itinerary-segment-trace-${segment.id}`}
            onClick={() => onInspectTrace(segment.traceId)}
          >
            {adminNextCopy.signature.manifest.inspectTraceAction}
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
          {adminNextCopy.signature.copilot.title}
        </div>
        <SignatureStatePill tone="live">{adminNextCopy.signature.copilot.suggestionPill}</SignatureStatePill>
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
                data-testid={`signature-copilot-trace-${suggestion.id}`}
                onClick={() => onInspectTrace(suggestion.traceId)}
              >
                {adminNextCopy.signature.copilot.inspectTraceAction}
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
            {adminNextCopy.signature.tracePreview.eyebrow}
          </div>
          <h2 className="mt-1 font-semibold">{adminNextCopy.signature.tracePreview.title}</h2>
        </div>
        <SignatureStatePill tone="humanLoop">{adminNextCopy.signature.tracePreview.humanLoopPill}</SignatureStatePill>
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
        data-testid="signature-trace-list-inspect"
        onClick={() => onInspectTrace(traceId)}
      >
        {adminNextCopy.signature.tracePreview.inspectTraceAction}
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
            {adminNextCopy.signature.liveFeedPanel.eyebrow}
          </div>
          <h2 className="mt-1 font-semibold">{adminNextCopy.signature.liveFeedPanel.title}</h2>
        </div>
        <SignatureStatePill tone="live">{adminNextCopy.signature.liveFeedPanel.livePill}</SignatureStatePill>
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
                data-testid={`signature-live-feed-trace-${item.id}`}
                onClick={() => onInspectTrace(item.traceId)}
              >
                {adminNextCopy.signature.liveFeedPanel.inspectTraceAction}
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
          {adminNextCopy.signature.marginGuard.title}
        </div>
        <div className="font-semibold text-[hsl(var(--bukeer-human-loop))]">{margin}</div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-background">
        <div className="h-2 w-3/4 rounded-full bg-[hsl(var(--bukeer-warning))]" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <SignatureMetric label={adminNextCopy.signature.marginGuard.revenueLabel} value={revenue} tone="structural" compact />
        <SignatureMetric label={adminNextCopy.signature.marginGuard.costLabel} value={cost} tone="structural" compact />
        <SignatureMetric label={adminNextCopy.signature.marginGuard.profitLabel} value={profit} tone="live" compact />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {adminNextCopy.signature.marginGuard.targetDescription(target)}
      </p>
    </section>
  );
}

export function SignatureMissingDataChecklist({ items }: { items: string[] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 font-semibold text-[hsl(var(--bukeer-human-loop))]">
        <CircleDot className="size-4" />
        {adminNextCopy.signature.missingData.title}
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

export function SignatureSafetyBoundary({
  dataSourceMode = 'fixture',
  simulationMessage,
}: {
  dataSourceMode?: AdminDataSourceMode;
  simulationMessage: string | null;
}) {
  const isReadonly = dataSourceMode === 'readonly';

  return (
    <section className="rounded-lg border border-border bg-card p-4 text-sm">
      <div className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="size-4 text-[hsl(var(--bukeer-live))]" />
        {isReadonly ? 'Read-only real data' : 'Fixture data only'}
      </div>
      <p className="mt-2 text-muted-foreground">
        {isReadonly
          ? 'This beta view can read scoped admin data, but approval controls remain local and no writes, tools, supplier holds or public-send workflows run.'
          : 'Approval controls update this prototype locally. They do not call Supabase, tools, or public-send workflows.'}
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
              <span className="font-semibold">{adminNextCopy.signature.approvalBar.requiredTitle}</span>
              <span className="text-muted-foreground">{approval.proposedAction}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{adminNextCopy.signature.approvalBar.riskLabel(approval.riskFlags.join(', '))}</span>
              <span>{adminNextCopy.signature.approvalBar.permissionLabel(approval.requiredPermission)}</span>
              <span>{approval.slaLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted"
            data-testid={`signature-approval-trace-${approval.id}`}
            onClick={() => onInspectTrace(approval.traceId)}
          >
            <MessageSquareText className="size-4" />
            {adminNextCopy.signature.approvalBar.inspectTraceAction}
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 px-3 text-sm font-medium text-destructive transition hover:bg-destructive/15"
            data-testid={`signature-approval-reject-${approval.id}`}
            onClick={() => onSimulate(adminNextCopy.signature.approvalBar.rejectedMessage)}
          >
            {adminNextCopy.signature.approvalBar.rejectAction}
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[hsl(var(--bukeer-live))] px-3 text-sm font-semibold text-white transition hover:opacity-90"
            data-testid={`signature-approval-approve-${approval.id}`}
            onClick={() => onSimulate(adminNextCopy.signature.approvalBar.approvedMessage)}
          >
            <CheckCircle2 className="size-4" />
            {adminNextCopy.signature.approvalBar.approveOnceAction}
          </button>
        </div>
      </div>
    </footer>
  );
}
